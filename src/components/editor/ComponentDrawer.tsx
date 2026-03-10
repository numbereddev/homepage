"use client";

import { useState, useCallback } from "react";
import CodeEditor from "./CodeEditor";
import TokenPalette from "./TokenPalette";
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
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newCategory, setNewCategory] = useState("Custom");
  const [newTemplate, setNewTemplate] = useState("");
  const [newDescription, setNewDescription] = useState("");

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
    if (!newLabel.trim() || !newTemplate.trim()) return;

    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newDef = parseComponentDefinition(
      id,
      newLabel.trim(),
      newCategory.trim() || "Custom",
      newTemplate,
      newDescription.trim() || undefined,
    );
    (newDef as ComponentDefinition & { isCustom: boolean }).isCustom = true;

    saveCustomComponents([...customComponents, newDef]);
    setNewLabel("");
    setNewCategory("Custom");
    setNewTemplate("");
    setNewDescription("");
    setShowAddForm(false);
  }, [newLabel, newCategory, newTemplate, newDescription, customComponents, saveCustomComponents]);

  const deleteCustomComponent = useCallback(
    (id: string) => {
      saveCustomComponents(customComponents.filter((c) => c.id !== id));
    },
    [customComponents, saveCustomComponents],
  );

  const handleDragStart = useCallback((e: React.DragEvent, definition: ComponentDefinition) => {
    const instance = createComponentInstance(definition);
    const html = renderInstance(instance, definition);
    e.dataTransfer.setData("component/html", html);
    e.dataTransfer.setData("component/definition", JSON.stringify(definition));
    e.dataTransfer.setData("component/instance", JSON.stringify(instance));
    e.dataTransfer.effectAllowed = "copy";
  }, []);

  const openEditor = useCallback((definition: ComponentDefinition) => {
    const instance = createComponentInstance(definition);
    setEditingInstance({ definition, instance });
  }, []);

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

        <aside className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-lg border-l border-[#202632] bg-[#0a0d12] drawer-panel flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#202632] px-5 py-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7d8a99]">
                Configure Component
              </p>
              <h2 className="mt-1 text-lg font-semibold text-white">{definition.label}</h2>
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

          <div className="flex-1 overflow-y-auto">
            {/* Field editors */}
            <div className="p-5 space-y-4 border-b border-[#202632]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7d8a99]">
                Fields
              </p>

              {definition.fields.map((field) => (
                <label key={field.name} className="block">
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
                    className="w-full border border-[#202632] bg-[#0b0f14] px-3 py-2 text-sm text-white outline-none transition placeholder:text-[#506172] focus:border-[#7dd3fc] font-mono"
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
                <div key={arrayDef.name} className="p-5 border-b border-[#202632]">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7d8a99]">
                      {arrayDef.name.replace(/([A-Z])/g, " $1").trim()}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleAddArrayItem(arrayDef.name)}
                      className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7dd3fc] hover:text-[#b6e8ff] transition-colors"
                    >
                      + Add Item
                    </button>
                  </div>

                  <div className="space-y-3">
                    {array.items.map((item, itemIndex) => (
                      <div
                        key={itemIndex}
                        className="border border-[#202632] bg-[#080b0f] p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] uppercase tracking-[0.14em] text-[#506172]">
                            Item {itemIndex + 1}
                          </span>
                          {array.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveArrayItem(arrayDef.name, itemIndex)}
                              className="text-[10px] text-[#5b3a3a] hover:text-[#ff8f8f] transition-colors"
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
                            className="w-full border border-[#202632] bg-[#0b0f14] px-3 py-2 text-sm text-white outline-none transition placeholder:text-[#506172] focus:border-[#7dd3fc] font-mono"
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Live preview */}
            <div className="p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7d8a99] mb-3">
                Preview
              </p>
              <div
                className="prose-flat border border-[#202632] bg-[#080b0f] p-4"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </div>

          <div className="border-t border-[#202632] p-4 flex gap-3">
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
              className="border border-[#3a4758] px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#c7d0db] transition hover:bg-[#151c25]"
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

      <aside className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md border-l border-[#202632] bg-[#0a0d12] drawer-panel flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#202632] px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7d8a99]">
              Components
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">Drag & Drop Library</h2>
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

        <div className="border-b border-[#202632] px-5 py-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search components..."
            className="w-full border border-[#202632] bg-[#0b0f14] px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-[#506172] focus:border-[#7dd3fc]"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto border-b border-[#202632] px-5 py-3 scrollbar-hide">
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

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-3">
            {filteredComponents.map((component) => (
              <div
                key={component.id}
                draggable
                onDragStart={(e) => handleDragStart(e, component)}
                className="group relative border border-[#202632] bg-[#0b0f14] transition-all hover:border-[#3a4758] cursor-grab active:cursor-grabbing"
              >
                <div className="flex items-start justify-between gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#f5f7fa]">
                        {component.label}
                      </span>
                      {"isCustom" in component && component.isCustom && (
                        <span className="px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] bg-[#1a1a2e] text-[#a78bfa] border border-[#2d2d4a]">
                          Custom
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[#607080]">
                      {component.category}
                    </p>
                    {component.description && (
                      <p className="mt-2 text-xs text-[#8fa1b3] line-clamp-2">
                        {component.description}
                      </p>
                    )}
                    {component.fields.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {component.fields.slice(0, 4).map((f) => (
                          <span
                            key={f.name}
                            className="px-1.5 py-0.5 text-[9px] bg-[#151f30] text-[#607080] border border-[#202632]"
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

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditor(component);
                      }}
                      className="p-2 text-[#7dd3fc] hover:text-[#b6e8ff] transition-colors"
                      title="Configure & insert"
                    >
                      <svg
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

                    {"isCustom" in component && component.isCustom && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCustomComponent(component.id);
                        }}
                        className="p-2 text-[#5b3a3a] hover:text-[#ff8f8f] transition-colors"
                        title="Delete component"
                      >
                        <svg
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
                    )}
                  </div>
                </div>

                <div className="absolute inset-0 flex items-center justify-center bg-[#0a0d12]/90 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7dd3fc]">
                    Drag to editor or click edit
                  </span>
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
              className="w-full border border-dashed border-[#3a4758] px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#7d8a99] hover:border-[#7dd3fc] hover:text-[#f5f7fa] transition-colors"
            >
              + Add Custom Component
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Component name"
                  className="flex-1 border border-[#202632] bg-[#0b0f14] px-3 py-2 text-sm text-white outline-none transition placeholder:text-[#506172] focus:border-[#7dd3fc]"
                />
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Category"
                  className="w-28 border border-[#202632] bg-[#0b0f14] px-3 py-2 text-sm text-white outline-none transition placeholder:text-[#506172] focus:border-[#7dd3fc]"
                />
              </div>

              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Description (optional)"
                className="w-full border border-[#202632] bg-[#0b0f14] px-3 py-2 text-sm text-white outline-none transition placeholder:text-[#506172] focus:border-[#7dd3fc]"
              />

              <div>
                <p className="mb-1.5 text-[10px] uppercase tracking-[0.14em] text-[#607080]">
                  Template (use {"{{field}}"}, {"{{#styledField}}"}, {"{{@each array}}...{{/each}}"}
                  )
                </p>
                <div className="border border-[#202632] bg-[#0b0f14]">
                  <CodeEditor value={newTemplate} onChange={setNewTemplate} minHeight={160} />
                  <div onMouseDown={(e) => e.preventDefault()}>
                    <TokenPalette />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={addCustomComponent}
                  disabled={!newLabel.trim() || !newTemplate.trim()}
                  className="flex-1 border border-[#3a4758] bg-[#f5f7fa] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#0a0d12] transition hover:bg-[#dfe6ee] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Component
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewLabel("");
                    setNewCategory("Custom");
                    setNewTemplate("");
                    setNewDescription("");
                  }}
                  className="border border-[#3a4758] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#c7d0db] transition hover:bg-[#151c25]"
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
