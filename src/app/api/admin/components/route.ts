import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import {
  deleteComponent,
  getAllComponents,
  getComponentById,
  saveComponent,
  type StoredComponentRecord,
} from "@/lib/content";
import { normalizePostSlug } from "@/lib/slugs";
import { clearExpiredAdminSessions, getAdminSession } from "@/lib/db";
import { ADMIN_SESSION_COOKIE_NAME } from "@/lib/auth";

type ComponentFieldInput = {
  name?: string;
  type?: "text" | "styled" | "array";
  defaultValue?: string;
  label?: string;
};

type ArrayFieldInput = {
  name?: string;
  itemTemplate?: string;
  items?: Array<Record<string, string>>;
  itemFields?: ComponentFieldInput[];
};

type CreateComponentBody = {
  originalId?: string;
  id?: string;
  label?: string;
  category?: string;
  description?: string;
  source?: string;
  fields?: ComponentFieldInput[];
  arrays?: ArrayFieldInput[];
};

type ComponentRecordResponse = {
  id: string;
  label: string;
  category: string;
  description?: string;
  source: string;
  fields: Array<{
    name: string;
    type: "text" | "styled" | "array";
    defaultValue: string;
    label?: string;
  }>;
  arrays: Array<{
    name: string;
    itemTemplate: string;
    items: Array<Record<string, string>>;
    itemFields: Array<{
      name: string;
      type: "text" | "styled" | "array";
      defaultValue: string;
      label?: string;
    }>;
  }>;
};

const SESSION_COOKIE_NAME = ADMIN_SESSION_COOKIE_NAME;

async function requireAdmin() {
  clearExpiredAdminSessions();

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return getAdminSession(token);
}

function normalizeComponentId(value: string) {
  return normalizePostSlug(value);
}

function normalizeField(input: ComponentFieldInput): StoredComponentRecord["fields"][number] {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const type: StoredComponentRecord["fields"][number]["type"] =
    input.type === "styled" || input.type === "array" ? input.type : "text";

  return {
    name,
    type,
    defaultValue: typeof input.defaultValue === "string" ? input.defaultValue : "",
    label: typeof input.label === "string" && input.label.trim() ? input.label.trim() : undefined,
  };
}

function normalizeFields(fields: unknown) {
  if (!Array.isArray(fields)) {
    return [];
  }

  return fields
    .filter((field): field is ComponentFieldInput => Boolean(field && typeof field === "object"))
    .map(normalizeField)
    .filter((field) => field.name);
}

function normalizeArrayItem(item: unknown): Record<string, string> | null {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    return null;
  }

  const entries = Object.entries(item).flatMap(([key, value]) => {
    const normalizedKey = key.trim();

    if (!normalizedKey) {
      return [];
    }

    return [[normalizedKey, typeof value === "string" ? value : String(value ?? "")] as const];
  });

  return Object.fromEntries(entries);
}

function normalizeArrayField(input: ArrayFieldInput): StoredComponentRecord["arrays"][number] {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const itemTemplate = typeof input.itemTemplate === "string" ? input.itemTemplate : "";
  const itemFields = normalizeFields(input.itemFields);
  const items = Array.isArray(input.items)
    ? input.items
        .map(normalizeArrayItem)
        .filter((item): item is Record<string, string> => item !== null)
    : [];

  return {
    name,
    itemTemplate,
    items,
    itemFields,
  };
}

function normalizeArrays(arrays: unknown) {
  if (!Array.isArray(arrays)) {
    return [];
  }

  return arrays
    .filter((array): array is ArrayFieldInput => Boolean(array && typeof array === "object"))
    .map(normalizeArrayField)
    .filter((array) => array.name);
}

function toComponentRecord(component: StoredComponentRecord): ComponentRecordResponse {
  return {
    id: component.id,
    label: component.label,
    category: component.category,
    description: component.description,
    source: component.source,
    fields: component.fields,
    arrays: component.arrays,
  };
}

export async function GET() {
  const session = await requireAdmin();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const components = getAllComponents();

  return NextResponse.json({
    components: components.map(toComponentRecord),
  });
}

export async function POST(request: Request) {
  const session = await requireAdmin();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: CreateComponentBody;

  try {
    body = (await request.json()) as CreateComponentBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const label = typeof body.label === "string" ? body.label.trim() : "";
  const category = typeof body.category === "string" ? body.category.trim() : "Custom";
  const description =
    typeof body.description === "string" && body.description.trim()
      ? body.description.trim()
      : undefined;
  const source = typeof body.source === "string" ? body.source : "";
  const requestedId = typeof body.id === "string" ? normalizeComponentId(body.id) : "";
  const originalId =
    typeof body.originalId === "string" ? normalizeComponentId(body.originalId) : "";
  const fields = normalizeFields(body.fields);
  const arrays = normalizeArrays(body.arrays);

  if (!label) {
    return NextResponse.json({ error: "Label is required." }, { status: 400 });
  }

  if (!source.trim()) {
    return NextResponse.json({ error: "Source is required." }, { status: 400 });
  }

  const finalId = requestedId || normalizeComponentId(label);

  if (!finalId) {
    return NextResponse.json({ error: "A valid id or label is required." }, { status: 400 });
  }

  const existingComponent = getComponentById(finalId);
  const isRenaming = Boolean(originalId && originalId !== finalId);

  if (existingComponent && existingComponent.id !== originalId) {
    return NextResponse.json({ error: "Another component already uses that id." }, { status: 409 });
  }

  if (isRenaming) {
    const originalComponent = getComponentById(originalId);

    if (!originalComponent) {
      return NextResponse.json(
        { error: "The original component could not be found for rename." },
        { status: 404 },
      );
    }
  }

  saveComponent({
    id: finalId,
    label,
    category,
    description,
    source,
    fields,
    arrays,
  });

  if (isRenaming) {
    deleteComponent(originalId);
  }

  revalidatePath("/");
  revalidatePath("/admin");

  const component = getComponentById(finalId);

  if (!component) {
    return NextResponse.json(
      { error: "Component was saved but could not be loaded." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    message: `Saved "${component.label}".`,
    id: finalId,
    component: toComponentRecord(component),
  });
}
