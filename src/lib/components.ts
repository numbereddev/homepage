/**
 * Component Template Engine
 *
 * Supports:
 * - {{fieldName}} - Basic text fields
 * - {{#styledField}} - Styled/formatted fields (rendered with special styling)
 * - [[arrayName]] - Array fields for repeated content
 * - {{@each items}}...{{/each}} - TSX-like iteration
 * - {{@component ComponentName}} - Nested component references
 */

export type FieldType = "text" | "styled" | "array";

export type ComponentField = {
  name: string;
  type: FieldType;
  defaultValue: string;
  label?: string;
};

export type ArrayField = {
  name: string;
  itemTemplate: string;
  items: Record<string, string>[];
  itemFields: ComponentField[];
};

export type ComponentInstance = {
  id: string;
  componentId: string;
  fields: Record<string, string>;
  arrays: Record<string, ArrayField>;
  nestedComponents: Record<string, ComponentInstance>;
};

export type ComponentDefinition = {
  id: string;
  label: string;
  category: string;
  description?: string;
  template: string;
  fields: ComponentField[];
  arrays: ArrayField[];
  isCustom?: boolean;
};

// Parse field placeholders from template
const FIELD_REGEX = /\{\{([#]?)([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;
const ARRAY_REGEX = /\[\[([a-zA-Z_][a-zA-Z0-9_]*)\]\]/g;
const EACH_REGEX = /\{\{@each\s+([a-zA-Z_][a-zA-Z0-9_]*)\}\}([\s\S]*?)\{\{\/each\}\}/g;
const NESTED_COMPONENT_REGEX = /\{\{@component\s+([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;

/**
 * Extract all field definitions from a template string
 */
export function extractFieldsFromTemplate(template: string): ComponentField[] {
  const fields: ComponentField[] = [];
  const seen = new Set<string>();

  let match;

  // Extract basic and styled fields
  const fieldRegex = new RegExp(FIELD_REGEX.source, "g");
  while ((match = fieldRegex.exec(template)) !== null) {
    const isStyled = match[1] === "#";
    const name = match[2];

    if (!seen.has(name)) {
      seen.add(name);
      fields.push({
        name,
        type: isStyled ? "styled" : "text",
        defaultValue: "",
        label: formatFieldLabel(name),
      });
    }
  }

  return fields;
}

/**
 * Extract array field definitions from a template
 */
export function extractArraysFromTemplate(template: string): ArrayField[] {
  const arrays: ArrayField[] = [];
  const seen = new Set<string>();

  // Extract @each loops
  let match;
  const eachRegex = new RegExp(EACH_REGEX.source, "g");
  while ((match = eachRegex.exec(template)) !== null) {
    const name = match[1];
    const itemTemplate = match[2];

    if (!seen.has(name)) {
      seen.add(name);
      const itemFields = extractFieldsFromTemplate(itemTemplate);
      arrays.push({
        name,
        itemTemplate,
        items: [createEmptyItem(itemFields)],
        itemFields,
      });
    }
  }

  // Also check for simple array markers [[arrayName]]
  const arrayRegex = new RegExp(ARRAY_REGEX.source, "g");
  while ((match = arrayRegex.exec(template)) !== null) {
    const name = match[1];
    if (!seen.has(name)) {
      seen.add(name);
      arrays.push({
        name,
        itemTemplate: `<div>{{item}}</div>`,
        items: [{ item: "" }],
        itemFields: [{ name: "item", type: "text", defaultValue: "", label: "Item" }],
      });
    }
  }

  return arrays;
}

/**
 * Extract nested component references from template
 */
export function extractNestedComponents(template: string): string[] {
  const components: string[] = [];
  const seen = new Set<string>();

  let match;
  const regex = new RegExp(NESTED_COMPONENT_REGEX.source, "g");
  while ((match = regex.exec(template)) !== null) {
    const name = match[1];
    if (!seen.has(name)) {
      seen.add(name);
      components.push(name);
    }
  }

  return components;
}

/**
 * Create an empty item for an array field
 */
function createEmptyItem(fields: ComponentField[]): Record<string, string> {
  const item: Record<string, string> = {};
  for (const field of fields) {
    item[field.name] = field.defaultValue;
  }
  return item;
}

/**
 * Format a field name into a human-readable label
 */
function formatFieldLabel(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^\s+/, "")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Render a component template with field values
 */
export function renderComponentTemplate(
  template: string,
  fields: Record<string, string>,
  arrays: Record<string, ArrayField> = {},
  nestedComponents: Record<string, string> = {}
): string {
  let result = template;

  // Replace @each loops with rendered items
  result = result.replace(
    new RegExp(EACH_REGEX.source, "g"),
    (_, arrayName, itemTemplate) => {
      const array = arrays[arrayName];
      if (!array || !array.items.length) {
        return "";
      }

      return array.items
        .map((item) => {
          let rendered = itemTemplate;
          for (const [key, value] of Object.entries(item)) {
            // Handle both {{field}} and {{#field}} syntax within items
            rendered = rendered.replace(
              new RegExp(`\\{\\{#?${key}\\}\\}`, "g"),
              value
            );
          }
          return rendered;
        })
        .join("\n");
    }
  );

  // Replace simple array markers with rendered items
  result = result.replace(new RegExp(ARRAY_REGEX.source, "g"), (_, arrayName) => {
    const array = arrays[arrayName];
    if (!array || !array.items.length) {
      return "";
    }

    return array.items
      .map((item) => {
        let rendered = array.itemTemplate;
        for (const [key, value] of Object.entries(item)) {
          rendered = rendered.replace(
            new RegExp(`\\{\\{#?${key}\\}\\}`, "g"),
            value
          );
        }
        return rendered;
      })
      .join("\n");
  });

  // Replace nested component references
  result = result.replace(
    new RegExp(NESTED_COMPONENT_REGEX.source, "g"),
    (_, componentName) => {
      return nestedComponents[componentName] || `<!-- Component: ${componentName} -->`;
    }
  );

  // Replace styled fields (with special wrapper)
  result = result.replace(/\{\{#([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g, (_, fieldName) => {
    const value = fields[fieldName] ?? "";
    return `<span class="styled-field" data-field="${fieldName}">${value}</span>`;
  });

  // Replace basic fields
  result = result.replace(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g, (_, fieldName) => {
    return fields[fieldName] ?? "";
  });

  return result;
}

/**
 * Create a component instance from a definition
 */
export function createComponentInstance(
  definition: ComponentDefinition
): ComponentInstance {
  const fields: Record<string, string> = {};
  for (const field of definition.fields) {
    fields[field.name] = field.defaultValue;
  }

  const arrays: Record<string, ArrayField> = {};
  for (const array of definition.arrays) {
    arrays[array.name] = {
      ...array,
      items: [createEmptyItem(array.itemFields)],
    };
  }

  return {
    id: generateInstanceId(),
    componentId: definition.id,
    fields,
    arrays,
    nestedComponents: {},
  };
}

/**
 * Parse a component definition from a template string
 */
export function parseComponentDefinition(
  id: string,
  label: string,
  category: string,
  template: string,
  description?: string
): ComponentDefinition {
  return {
    id,
    label,
    category,
    description,
    template,
    fields: extractFieldsFromTemplate(template),
    arrays: extractArraysFromTemplate(template),
  };
}

/**
 * Generate a unique instance ID
 */
function generateInstanceId(): string {
  return `inst-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Validate that all required fields have values
 */
export function validateComponentInstance(
  instance: ComponentInstance,
  definition: ComponentDefinition
): string[] {
  const errors: string[] = [];

  for (const field of definition.fields) {
    if (!instance.fields[field.name]?.trim()) {
      errors.push(`Field "${field.label || field.name}" is empty`);
    }
  }

  return errors;
}

/**
 * Clone a component instance with a new ID
 */
export function cloneComponentInstance(instance: ComponentInstance): ComponentInstance {
  return {
    ...instance,
    id: generateInstanceId(),
    fields: { ...instance.fields },
    arrays: Object.fromEntries(
      Object.entries(instance.arrays).map(([key, array]) => [
        key,
        {
          ...array,
          items: array.items.map((item) => ({ ...item })),
        },
      ])
    ),
    nestedComponents: { ...instance.nestedComponents },
  };
}

/**
 * Add an item to an array field
 */
export function addArrayItem(
  instance: ComponentInstance,
  arrayName: string
): ComponentInstance {
  const array = instance.arrays[arrayName];
  if (!array) return instance;

  const newItem = createEmptyItem(array.itemFields);

  return {
    ...instance,
    arrays: {
      ...instance.arrays,
      [arrayName]: {
        ...array,
        items: [...array.items, newItem],
      },
    },
  };
}

/**
 * Remove an item from an array field
 */
export function removeArrayItem(
  instance: ComponentInstance,
  arrayName: string,
  index: number
): ComponentInstance {
  const array = instance.arrays[arrayName];
  if (!array || index < 0 || index >= array.items.length) return instance;

  // Don't allow removing the last item
  if (array.items.length <= 1) return instance;

  return {
    ...instance,
    arrays: {
      ...instance.arrays,
      [arrayName]: {
        ...array,
        items: array.items.filter((_, i) => i !== index),
      },
    },
  };
}

/**
 * Update a field value in an array item
 */
export function updateArrayItemField(
  instance: ComponentInstance,
  arrayName: string,
  itemIndex: number,
  fieldName: string,
  value: string
): ComponentInstance {
  const array = instance.arrays[arrayName];
  if (!array || itemIndex < 0 || itemIndex >= array.items.length) return instance;

  const newItems = [...array.items];
  newItems[itemIndex] = {
    ...newItems[itemIndex],
    [fieldName]: value,
  };

  return {
    ...instance,
    arrays: {
      ...instance.arrays,
      [arrayName]: {
        ...array,
        items: newItems,
      },
    },
  };
}

/**
 * Update a field value in the component instance
 */
export function updateInstanceField(
  instance: ComponentInstance,
  fieldName: string,
  value: string
): ComponentInstance {
  return {
    ...instance,
    fields: {
      ...instance.fields,
      [fieldName]: value,
    },
  };
}

/**
 * Render an instance to final HTML
 */
export function renderInstance(
  instance: ComponentInstance,
  definition: ComponentDefinition,
  nestedHtml: Record<string, string> = {}
): string {
  return renderComponentTemplate(
    definition.template,
    instance.fields,
    instance.arrays,
    nestedHtml
  );
}

// Re-export for convenience
export { generateInstanceId as generateId };
