"use client";

import { useState, useCallback, useRef } from "react";
import CodeEditor from "./CodeEditor";
import TokenPalette from "./TokenPalette";
import { useSharedEditorModalKeyboardShortcuts } from "./sharedEditorModal";
import {
  type ComponentDefinition,
  type ComponentInstance,
  parseComponentDefinition,
  createComponentInstance,
  renderInstance,
  updateInstanceField,
  addArrayItem,
  removeArrayItem,
  updateArrayItemField,
} from "@/lib/components";

type ComponentDrawerProps = {
  onInsert: (html: string, instance?: ComponentInstance) => void;
  isOpen: boolean;
  onClose: () => void;
};

const CUSTOM_COMPONENTS_KEY = "admin-custom-components";

// Default component definitions with dynamic fields
const defaultComponentDefinitions: ComponentDefinition[] = [
  parseComponentDefinition(
    "stat-card",
    "Stat Card",
    "Data",
    `<div style="border:1px solid var(--border);padding:24px;background:var(--panel)">
  <div style="font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:var(--accent);margin-bottom:12px">
    {{label}}
  </div>
  <div style="font-size:56px;font-weight:700;line-height:1;color:var(--foreground)">{{#value}}</div>
  <p style="margin-top:12px;color:var(--muted);line-height:1.7">
    {{description}}
  </p>
</div>`,
    "A card displaying a large statistic with label and description",
  ),
  parseComponentDefinition(
    "feature-grid",
    "Feature Grid",
    "Layout",
    `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1px;background:var(--border);border:1px solid var(--border)">
  {{@each features}}
  <div style="background:var(--panel);padding:20px">
    <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);margin-bottom:8px">{{#title}}</div>
    <p style="margin:0;color:var(--muted);line-height:1.7;font-size:14px">{{description}}</p>
  </div>
  {{/each}}
</div>`,
    "A responsive grid of feature items",
  ),
  parseComponentDefinition(
    "callout-panel",
    "Callout Panel",
    "Content",
    `<div style="border:1px solid var(--border);background:var(--panel);padding:20px">
  <div style="font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:var(--accent);margin-bottom:10px">
    {{label}}
  </div>
  <h3 style="margin:0 0 10px 0;color:var(--foreground);font-size:28px">
    {{#heading}}
  </h3>
  <p style="margin:0;color:var(--muted);line-height:1.8">
    {{content}}
  </p>
</div>`,
    "A highlighted callout box with heading and content",
  ),
  parseComponentDefinition(
    "quote-block",
    "Quote Block",
    "Content",
    `<blockquote style="border-left:3px solid var(--accent);margin:0;padding:16px 20px;background:var(--panel)">
  <p style="margin:0 0 12px 0;color:var(--foreground);font-size:18px;line-height:1.7;font-style:italic">
    "{{#quote}}"
  </p>
  <cite style="color:var(--accent);font-size:14px;font-style:normal">— {{author}}</cite>
</blockquote>`,
    "A styled blockquote with attribution",
  ),
  parseComponentDefinition(
    "progress-bar",
    "Progress Bar",
    "Data",
    `<div style="border:1px solid var(--border);background:var(--panel);padding:20px">
  <div style="display:flex;justify-content:space-between;margin-bottom:8px">
    <span style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--accent)">{{label}}</span>
    <span style="color:var(--foreground);font-size:14px">{{percentage}}%</span>
  </div>
  <div style="height:8px;background:var(--panel-3);overflow:hidden">
    <div style="width:{{percentage}}%;height:100%;background:linear-gradient(90deg,var(--accent-strong),var(--accent))"></div>
  </div>
</div>`,
    "A visual progress indicator",
  ),
  parseComponentDefinition(
    "image-card",
    "Image Card",
    "Media",
    `<figure style="margin:0;border:1px solid var(--border);background:var(--panel);overflow:hidden">
  <img src="{{imageUrl}}" alt="{{altText}}" style="width:100%;height:auto;display:block" />
  <figcaption style="padding:16px;border-top:1px solid var(--border)">
    <p style="margin:0;color:var(--muted);font-size:14px;line-height:1.6">
      {{caption}}
    </p>
  </figcaption>
</figure>`,
    "An image with caption",
  ),
  parseComponentDefinition(
    "accordion",
    "Accordion",
    "Interactive",
    `<details style="border:1px solid var(--border);background:var(--panel)">
  <summary style="padding:16px 20px;cursor:pointer;color:var(--foreground);font-weight:600;user-select:none">
    {{#title}}
  </summary>
  <div style="padding:0 20px 20px;color:var(--muted);line-height:1.8">
    {{content}}
  </div>
</details>`,
    "Expandable/collapsible content section",
  ),
  parseComponentDefinition(
    "badge-list",
    "Badge List",
    "Content",
    `<div style="display:flex;flex-wrap:wrap;gap:8px">
  {{@each badges}}
  <span style="border:1px solid {{borderColor}};background:var(--panel);padding:6px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.16em;color:{{textColor}}">{{label}}</span>
  {{/each}}
</div>`,
    "A row of styled badges/tags",
  ),
  parseComponentDefinition(
    "code-example",
    "Code Example",
    "Content",
    `<div style="border:1px solid var(--border);background:var(--panel);overflow:hidden">
  <div style="padding:12px 16px;border-bottom:1px solid var(--border);background:var(--background)">
    <span style="font-size:11px;text-transform:uppercase;letter-spacing:.18em;color:var(--accent)">{{language}}</span>
  </div>
  <pre style="margin:0;padding:16px;overflow-x:auto;font-family:monospace;font-size:14px;line-height:1.7;color:var(--foreground)"><code>{{code}}</code></pre>
</div>`,
    "A styled code block with language label",
  ),
  parseComponentDefinition(
    "cta-box",
    "Call to Action",
    "Content",
    `<div style="border:1px solid var(--accent);background:var(--panel);padding:32px;text-align:center">
  <h3 style="margin:0 0 12px 0;color:var(--foreground);font-size:24px;font-weight:600">{{#heading}}</h3>
  <p style="margin:0 0 20px 0;color:var(--muted);line-height:1.7">{{description}}</p>
  <a href="{{buttonUrl}}" style="display:inline-block;padding:12px 24px;background:var(--accent);color:var(--background);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.18em;text-decoration:none">{{buttonText}}</a>
</div>`,
    "A prominent call-to-action section",
  ),
];

// Set default values for the default components
defaultComponentDefinitions.forEach((def) => {
  if (def.id === "stat-card") {
    def.fields.find((f) => f.name === "label")!.defaultValue = "Metric";
    def.fields.find((f) => f.name === "value")!.defaultValue = "1,234";
    def.fields.find((f) => f.name === "description")!.defaultValue = "Description of this metric";
  }
  if (def.id === "feature-grid" && def.arrays[0]) {
    def.arrays[0].items = [
      { title: "Fast", description: "Optimized for speed" },
      { title: "Secure", description: "Built with security in mind" },
      { title: "Scalable", description: "Grows with your needs" },
    ];
  }
  if (def.id === "callout-panel") {
    def.fields.find((f) => f.name === "label")!.defaultValue = "Key Idea";
    def.fields.find((f) => f.name === "heading")!.defaultValue = "Your heading here";
    def.fields.find((f) => f.name === "content")!.defaultValue = "Your content here";
  }
  if (def.id === "quote-block") {
    def.fields.find((f) => f.name === "quote")!.defaultValue = "Your quote here";
    def.fields.find((f) => f.name === "author")!.defaultValue = "Author Name";
  }
  if (def.id === "progress-bar") {
    def.fields.find((f) => f.name === "label")!.defaultValue = "Progress";
    def.fields.find((f) => f.name === "percentage")!.defaultValue = "75";
  }
  if (def.id === "image-card") {
    def.fields.find((f) => f.name === "imageUrl")!.defaultValue = "/placeholder.jpg";
    def.fields.find((f) => f.name === "altText")!.defaultValue = "Image description";
    def.fields.find((f) => f.name === "caption")!.defaultValue = "Image caption";
  }
  if (def.id === "accordion") {
    def.fields.find((f) => f.name === "title")!.defaultValue = "Click to expand";
    def.fields.find((f) => f.name === "content")!.defaultValue = "Hidden content goes here";
  }
  if (def.id === "badge-list" && def.arrays[0]) {
    def.arrays[0].items = [
      { label: "Active", borderColor: "var(--success)", textColor: "var(--success)" },
      { label: "Pending", borderColor: "var(--danger)", textColor: "var(--danger)" },
    ];
  }
  if (def.id === "code-example") {
    def.fields.find((f) => f.name === "language")!.defaultValue = "TypeScript";
    def.fields.find((f) => f.name === "code")!.defaultValue = 'console.log("Hello!");';
  }
  if (def.id === "cta-box") {
    def.fields.find((f) => f.name === "heading")!.defaultValue = "Ready to get started?";
    def.fields.find((f) => f.name === "description")!.defaultValue = "Join thousands of developers";
    def.fields.find((f) => f.name === "buttonUrl")!.defaultValue = "#";
    def.fields.find((f) => f.name === "buttonText")!.defaultValue = "Get Started";
  }
});

export default function ComponentDrawer({ onInsert, isOpen, onClose }: ComponentDrawerProps) {
  const [customComponents, setCustomComponents] = useState<ComponentDefinition[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [editingInstance, setEditingInstance] = useState<{
    definition: ComponentDefinition;
    instance: ComponentInstance;
  } | null>(null);
  const [editingSourceComponent, setEditingSourceComponent] = useState<ComponentDefinition | null>(
    null,
  );
  const [sourceLabel, setSourceLabel] = useState("");
  const [sourceCategory, setSourceCategory] = useState("Custom");
  const [sourceTemplate, setSourceTemplate] = useState("");
  const [sourceDescription, setSourceDescription] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const sourceEditorInsertRef = useRef<((text: string) => void) | null>(null);
  const sourceEditorPaletteRef = useRef<HTMLDivElement | null>(null);

  // Initialize custom components from localStorage on mount
  const [isInitialized, setIsInitialized] = useState(false);

  if (!isInitialized) {
    try {
      const stored = localStorage.getItem(CUSTOM_COMPONENTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCustomComponents(parsed);
        }
      }
    } catch {
      // Ignore localStorage errors
    }
    setIsInitialized(true);
  }

  const saveCustomComponents = useCallback((components: ComponentDefinition[]) => {
    setCustomComponents(components);
    try {
      localStorage.setItem(CUSTOM_COMPONENTS_KEY, JSON.stringify(components));
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const addCustomComponent = useCallback(() => {
    setEditingSourceComponent({
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label: "",
      category: "Custom",
      description: "",
      template: "",
      fields: [],
      arrays: [],
      isCustom: true,
    } as ComponentDefinition);
    setSourceLabel("");
    setSourceCategory("Custom");
    setSourceTemplate("");
    setSourceDescription("");
    setShowAddForm(false);
  }, []);

  const deleteCustomComponent = useCallback(
    (id: string) => {
      saveCustomComponents(customComponents.filter((c) => c.id !== id));
    },
    [customComponents, saveCustomComponents],
  );

  const openEditor = useCallback((definition: ComponentDefinition) => {
    const instance = createComponentInstance(definition);
    setEditingInstance({ definition, instance });
  }, []);

  const openSourceEditor = useCallback((definition: ComponentDefinition) => {
    setEditingSourceComponent(definition);
    setSourceLabel(definition.label);
    setSourceCategory(definition.category);
    setSourceTemplate(definition.template);
    setSourceDescription(definition.description || "");
  }, []);

  useSharedEditorModalKeyboardShortcuts({
    isOpen,
    showConfirmClose: false,
    showComponentDrawer: false,
    showAssetPicker: false,
    lockBodyScroll: true,
    onSaveAction: () => {},
    onUndoAction: () => {},
    onRedoAction: () => {},
    onRequestCloseAction: onClose,
    onDismissConfirmCloseAction: onClose,
  });

  const handleSaveSourceComponent = useCallback(() => {
    if (!editingSourceComponent || !sourceLabel.trim() || !sourceTemplate.trim()) return;

    const updatedDef = parseComponentDefinition(
      editingSourceComponent.id,
      sourceLabel.trim(),
      sourceCategory.trim() || "Custom",
      sourceTemplate,
      sourceDescription.trim() || undefined,
    );
    (updatedDef as ComponentDefinition & { isCustom: boolean }).isCustom = true;

    const existingIndex = customComponents.findIndex(
      (component) => component.id === editingSourceComponent.id,
    );

    saveCustomComponents(
      existingIndex >= 0
        ? customComponents.map((component) =>
            component.id === editingSourceComponent.id ? updatedDef : component,
          )
        : [...customComponents, updatedDef],
    );
    setEditingSourceComponent(null);
    setSourceLabel("");
    setSourceCategory("Custom");
    setSourceTemplate("");
    setSourceDescription("");
  }, [
    editingSourceComponent,
    sourceLabel,
    sourceCategory,
    sourceTemplate,
    sourceDescription,
    customComponents,
    saveCustomComponents,
  ]);

  const handleFieldChange = useCallback(
    (fieldName: string, value: string) => {
      if (!editingInstance) return;
      setEditingInstance({
        ...editingInstance,
        instance: updateInstanceField(editingInstance.instance, fieldName, value),
      });
    },
    [editingInstance],
  );

  const handleArrayItemChange = useCallback(
    (arrayName: string, itemIndex: number, fieldName: string, value: string) => {
      if (!editingInstance) return;
      setEditingInstance({
        ...editingInstance,
        instance: updateArrayItemField(
          editingInstance.instance,
          arrayName,
          itemIndex,
          fieldName,
          value,
        ),
      });
    },
    [editingInstance],
  );

  const handleAddArrayItem = useCallback(
    (arrayName: string) => {
      if (!editingInstance) return;
      setEditingInstance({
        ...editingInstance,
        instance: addArrayItem(editingInstance.instance, arrayName),
      });
    },
    [editingInstance],
  );

  const handleRemoveArrayItem = useCallback(
    (arrayName: string, index: number) => {
      if (!editingInstance) return;
      setEditingInstance({
        ...editingInstance,
        instance: removeArrayItem(editingInstance.instance, arrayName, index),
      });
    },
    [editingInstance],
  );

  const handleInsertComponent = useCallback(() => {
    if (!editingInstance) return;
    const html = renderInstance(editingInstance.instance, editingInstance.definition);
    onInsert(html, editingInstance.instance);
    setEditingInstance(null);
  }, [editingInstance, onInsert]);

  const allComponents = [...defaultComponentDefinitions, ...customComponents];

  const categories = Array.from(new Set(allComponents.map((c) => c.category))).sort();

  const filteredComponents = allComponents.filter((component) => {
    const matchesSearch =
      !searchQuery ||
      component.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      component.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (component.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

    const matchesCategory = !activeCategory || component.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  if (!isOpen) return null;

  // Custom component source editor view
  if (editingSourceComponent) {
    return (
      <>
        <div
          className="fixed inset-0 z-40 drawer-backdrop"
          onClick={() => setEditingSourceComponent(null)}
        />

        <aside className="fixed inset-2 z-50 flex max-h-[calc(100dvh-1rem)] min-h-0 min-w-0 flex-col overflow-hidden border border-[#202632] bg-[#0a0d12] drawer-panel sm:fixed sm:top-0 sm:right-0 sm:bottom-0 sm:left-auto sm:max-h-none sm:w-full sm:max-w-lg sm:border-l sm:border-y-0 sm:border-r-0">
          <div className="flex min-w-0 items-center justify-between gap-3 border-b border-[#202632] px-4 py-4 sm:px-5">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7d8a99]">
                Edit Custom Component
              </p>
              <h2 className="mt-1 truncate text-lg font-semibold text-white">
                {sourceLabel || "Untitled"}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setEditingSourceComponent(null)}
              className="p-2 text-[#607080] hover:text-[#f5f7fa] transition-colors"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4 space-y-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={sourceLabel}
                onChange={(e) => setSourceLabel(e.target.value)}
                placeholder="Component name"
                className="w-full min-w-0 flex-1 border border-[#202632] bg-[#0b0f14] px-3 py-2 text-sm text-white outline-none transition placeholder:text-[#506172] focus:border-[#7dd3fc]"
              />
              <input
                type="text"
                value={sourceCategory}
                onChange={(e) => setSourceCategory(e.target.value)}
                placeholder="Category"
                className="w-full border border-[#202632] bg-[#0b0f14] px-3 py-2 text-sm text-white outline-none transition placeholder:text-[#506172] focus:border-[#7dd3fc] sm:w-28"
              />
            </div>

            <input
              type="text"
              value={sourceDescription}
              onChange={(e) => setSourceDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-full min-w-0 border border-[#202632] bg-[#0b0f14] px-3 py-2 text-sm text-white outline-none transition placeholder:text-[#506172] focus:border-[#7dd3fc]"
            />

            <div className="min-w-0 overflow-hidden">
              <p className="mb-1.5 text-[10px] uppercase tracking-[0.14em] text-[#607080]">
                Template (use {"{{field}}"}, {"{{#styledField}}"}, {"{{@each array}}...{{/each}}"})
              </p>
              <div className="min-w-0 overflow-hidden border border-[#202632] bg-[#0b0f14]">
                <CodeEditor
                  value={sourceTemplate}
                  onChange={setSourceTemplate}
                  paletteRef={sourceEditorPaletteRef}
                  insertRef={sourceEditorInsertRef}
                  minHeight={220}
                />
                <div ref={sourceEditorPaletteRef}>
                  <TokenPalette onInsert={(text) => sourceEditorInsertRef.current?.(text)} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-[#202632] p-4 sm:flex-row">
            <button
              type="button"
              onClick={handleSaveSourceComponent}
              disabled={!sourceLabel.trim() || !sourceTemplate.trim()}
              className="flex-1 border border-[#3a4758] bg-[#f5f7fa] px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#0a0d12] transition hover:bg-[#dfe6ee] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Source
            </button>
            <button
              type="button"
              onClick={() => setEditingSourceComponent(null)}
              className="w-full border border-[#3a4758] px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#c7d0db] transition hover:bg-[#151c25] sm:w-auto"
            >
              Cancel
            </button>
          </div>
        </aside>
      </>
    );
  }

  // Component field editor view
  if (editingInstance) {
    const { definition, instance } = editingInstance;
    const previewHtml = renderInstance(instance, definition);

    return (
      <>
        <div
          className="fixed inset-0 z-40 drawer-backdrop"
          onClick={() => setEditingInstance(null)}
        />

        <aside className="fixed inset-2 z-50 flex max-h-[calc(100dvh-1rem)] min-h-0 min-w-0 flex-col overflow-hidden border border-[#202632] bg-[#0a0d12] drawer-panel sm:fixed sm:top-0 sm:right-0 sm:bottom-0 sm:left-auto sm:max-h-none sm:w-full sm:max-w-lg sm:border-l sm:border-y-0 sm:border-r-0">
          <div className="flex min-w-0 items-center justify-between gap-3 border-b border-[#202632] px-4 py-4 sm:px-5">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7d8a99]">
                Configure Component
              </p>
              <h2 className="mt-1 truncate text-lg font-semibold text-white">{definition.label}</h2>
            </div>
            <button
              type="button"
              onClick={() => setEditingInstance(null)}
              className="p-2 text-[#607080] hover:text-[#f5f7fa] transition-colors"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
            {/* Field editors */}
            <div className="space-y-4 border-b border-[#202632] p-4 sm:p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7d8a99]">
                Fields
              </p>

              {definition.fields.map((field) => (
                <label key={field.name} className="block min-w-0">
                  <span className="mb-1.5 block text-xs font-medium text-[#c7d0db]">
                    {field.label}
                    {field.type === "styled" && (
                      <span className="ml-2 text-[9px] uppercase tracking-wider text-[#7dd3fc]">
                        styled
                      </span>
                    )}
                  </span>
                  <input
                    type="text"
                    value={instance.fields[field.name] ?? ""}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    className="w-full min-w-0 border border-[#202632] bg-[#0b0f14] px-3 py-2 text-sm text-white outline-none transition placeholder:text-[#506172] focus:border-[#7dd3fc] font-mono"
                    placeholder={field.defaultValue || `Enter ${field.label?.toLowerCase()}`}
                  />
                </label>
              ))}
            </div>

            {/* Array field editors */}
            {definition.arrays.map((arrayDef) => {
              const array = instance.arrays[arrayDef.name];
              if (!array) return null;

              return (
                <div key={arrayDef.name} className="border-b border-[#202632] p-4 sm:p-5">
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7d8a99]">
                      {arrayDef.name.replace(/([A-Z])/g, " $1").trim()}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleAddArrayItem(arrayDef.name)}
                      className="w-full px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7dd3fc] transition-colors hover:text-[#b6e8ff] sm:w-auto"
                    >
                      + Add Item
                    </button>
                  </div>

                  <div className="space-y-3">
                    {array.items.map((item, itemIndex) => (
                      <div
                        key={itemIndex}
                        className="space-y-2 border border-[#202632] bg-[#080b0f] p-3"
                      >
                        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <span className="text-[10px] uppercase tracking-[0.14em] text-[#506172]">
                            Item {itemIndex + 1}
                          </span>
                          {array.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveArrayItem(arrayDef.name, itemIndex)}
                              className="w-full border border-[#5b3a3a] px-2 py-2 text-[10px] text-[#ff8f8f] transition-colors hover:bg-[#1a1010] sm:w-auto sm:border-0 sm:px-0 sm:py-0 sm:text-[#5b3a3a] sm:hover:bg-transparent sm:hover:text-[#ff8f8f]"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        {arrayDef.itemFields.map((field) => (
                          <input
                            key={field.name}
                            type="text"
                            value={item[field.name] ?? ""}
                            onChange={(e) =>
                              handleArrayItemChange(
                                arrayDef.name,
                                itemIndex,
                                field.name,
                                e.target.value,
                              )
                            }
                            placeholder={field.label || field.name}
                            className="w-full min-w-0 border border-[#202632] bg-[#0b0f14] px-3 py-2 text-sm text-white outline-none transition placeholder:text-[#506172] focus:border-[#7dd3fc] font-mono"
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Live preview */}
            <div className="p-4 sm:p-5">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7d8a99]">
                Preview
              </p>
              <div
                className="prose-flat overflow-x-auto border border-[#202632] bg-[#080b0f] p-4"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-[#202632] p-4 sm:flex-row">
            <button
              type="button"
              onClick={handleInsertComponent}
              className="flex-1 border border-[#3a4758] bg-[#f5f7fa] px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#0a0d12] transition hover:bg-[#dfe6ee]"
            >
              Insert Component
            </button>
            <button
              type="button"
              onClick={() => setEditingInstance(null)}
              className="w-full border border-[#3a4758] px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#c7d0db] transition hover:bg-[#151c25] sm:w-auto"
            >
              Cancel
            </button>
          </div>
        </aside>
      </>
    );
  }

  // Main component list view
  return (
    <>
      <div className="fixed inset-0 z-40 drawer-backdrop" onClick={onClose} />

      <aside className="fixed inset-2 z-50 flex max-h-[calc(100dvh-1rem)] min-h-0 min-w-0 flex-col overflow-hidden border border-[#202632] bg-[#0a0d12] drawer-panel sm:fixed sm:top-0 sm:right-0 sm:bottom-0 sm:left-auto sm:max-h-none sm:w-full sm:max-w-md sm:border-l sm:border-y-0 sm:border-r-0">
        <div className="flex min-w-0 items-center justify-between gap-3 border-b border-[#202632] px-4 py-4 sm:px-5">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7d8a99]">
              Components
            </p>
            <h2 className="mt-1 truncate text-lg font-semibold text-white">Component Library</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#607080] hover:text-[#f5f7fa] transition-colors"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="border-b border-[#202632] px-4 py-3 sm:px-5">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search components..."
            className="w-full min-w-0 border border-[#202632] bg-[#0b0f14] px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-[#506172] focus:border-[#7dd3fc]"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto border-b border-[#202632] px-4 py-3 scrollbar-hide sm:px-5">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={[
              "shrink-0 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors border",
              activeCategory === null
                ? "border-[#7dd3fc] text-[#7dd3fc] bg-[#0f1520]"
                : "border-[#202632] text-[#8fa1b3] hover:border-[#3a4758]",
            ].join(" ")}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={[
                "shrink-0 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors border",
                activeCategory === category
                  ? "border-[#7dd3fc] text-[#7dd3fc] bg-[#0f1520]"
                  : "border-[#202632] text-[#8fa1b3] hover:border-[#3a4758]",
              ].join(" ")}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-5">
          <div className="space-y-3">
            {filteredComponents.map((component) => (
              <div
                key={component.id}
                className="group relative w-full border border-[#202632] bg-[#0b0f14] text-left transition-all hover:border-[#3a4758] cursor-pointer"
                onClick={() => openEditor(component)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openEditor(component);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-[#f5f7fa]">
                        {component.label}
                      </span>
                      {"isCustom" in component && component.isCustom && (
                        <span className="border border-[#2d2d4a] bg-[#1a1a2e] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] text-[#a78bfa]">
                          Custom
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[#607080]">
                      {component.category}
                    </p>
                    {component.description && (
                      <p className="mt-2 line-clamp-2 text-xs text-[#8fa1b3]">
                        {component.description}
                      </p>
                    )}
                    {component.fields.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {component.fields.slice(0, 4).map((f) => (
                          <span
                            key={f.name}
                            className="border border-[#202632] bg-[#151f30] px-1.5 py-0.5 text-[9px] text-[#607080]"
                          >
                            {f.name}
                          </span>
                        ))}
                        {component.fields.length > 4 && (
                          <span className="px-1.5 py-0.5 text-[9px] text-[#506172]">
                            +{component.fields.length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {"isCustom" in component && component.isCustom && (
                    <div className="flex w-full items-center gap-1 opacity-100 transition-opacity sm:w-auto sm:opacity-0 sm:group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openSourceEditor(component);
                        }}
                        className="flex-1 p-2 text-[#7dd3fc] transition-colors hover:text-[#b6e8ff] sm:flex-none"
                        title="Edit component source"
                      >
                        <svg
                          className="mx-auto"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCustomComponent(component.id);
                        }}
                        className="flex-1 p-2 text-[#5b3a3a] transition-colors hover:text-[#ff8f8f] sm:flex-none"
                        title="Delete component"
                      >
                        <svg
                          className="mx-auto"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {filteredComponents.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-sm text-[#607080]">No components found.</p>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-[#202632] p-4">
          {!showAddForm ? (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="w-full border border-dashed border-[#3a4758] px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#7d8a99] transition-colors hover:border-[#7dd3fc] hover:text-[#f5f7fa]"
            >
              + Add Custom Component
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-[#8fa1b3]">
                Create custom components in the full source editor.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={addCustomComponent}
                  className="flex-1 border border-[#3a4758] bg-[#f5f7fa] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#0a0d12] transition hover:bg-[#dfe6ee]"
                >
                  Open Full Editor
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                  }}
                  className="w-full border border-[#3a4758] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#c7d0db] transition hover:bg-[#151c25] sm:w-auto"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

export { defaultComponentDefinitions };
