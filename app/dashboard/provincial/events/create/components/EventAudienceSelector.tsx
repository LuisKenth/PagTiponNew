"use client";

type AudienceType = "all" | "categories" | null;

type Props = {
  audienceType: AudienceType;
  selectedCategories: string[];
  audienceCategoryOther: string;
  onAudienceTypeChange: (value: AudienceType) => void;
  onToggleCategory: (value: string) => void;
  onAudienceCategoryOtherChange: (value: string) => void;
};

const CATEGORIES = [
  { value: "farmer", label: "Farmer" },
  { value: "senior citizen", label: "Senior Citizen" },
  { value: "4ps", label: "4Ps" },
  { value: "fisherman", label: "Fisherman" },
  { value: "others", label: "Others" },
];

export default function EventAudienceSelector({
  audienceType,
  selectedCategories,
  audienceCategoryOther,
  onAudienceTypeChange,
  onToggleCategory,
  onAudienceCategoryOtherChange,
}: Props) {
  const includesOthers = selectedCategories.includes("others");

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">
          Participant audience
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Choose which participants can see this event and register.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-4 hover:bg-slate-50">
          <input
            type="radio"
            name="event-audience"
            value="all"
            checked={audienceType === "all"}
            onChange={() => onAudienceTypeChange("all")}
            className="mt-1"
          />
          <span>
            <span className="block font-medium text-slate-900">
              Open to all participants
            </span>
            <span className="mt-1 block text-sm text-slate-600">
              Any participant in an assigned municipality can view and register.
            </span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-4 hover:bg-slate-50">
          <input
            type="radio"
            name="event-audience"
            value="categories"
            checked={audienceType === "categories"}
            onChange={() => onAudienceTypeChange("categories")}
            className="mt-1"
          />
          <span>
            <span className="block font-medium text-slate-900">
              Specific participant categories
            </span>
            <span className="mt-1 block text-sm text-slate-600">
              Only participants in the selected categories can view and register.
            </span>
          </span>
        </label>
      </div>

      {audienceType === "categories" && (
        <fieldset className="mt-4 rounded-lg border border-slate-200 p-4">
          <legend className="px-1 text-sm font-medium text-slate-800">
            Select one or more categories
          </legend>

          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((category) => (
              <label
                key={category.value}
                className="flex items-center gap-2 text-sm text-slate-700"
              >
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(category.value)}
                  onChange={() => onToggleCategory(category.value)}
                  className="rounded border-slate-300"
                />
                {category.label}
              </label>
            ))}
          </div>

          {includesOthers && (
            <div className="mt-4">
              <label
                htmlFor="audience-category-other"
                className="mb-1 block text-sm font-medium text-slate-800"
              >
                Specify the “Others” category (optional)
              </label>

              <input
                id="audience-category-other"
                type="text"
                value={audienceCategoryOther}
                onChange={(event) =>
                  onAudienceCategoryOtherChange(event.target.value)
                }
                maxLength={100}
                placeholder="e.g. Barangay Health Worker"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />

              <p className="mt-1 text-xs text-slate-500">
                Leave blank to include every participant whose category is
                Others. If specified, only participants with the same detail can
                view and register.
              </p>
            </div>
          )}
        </fieldset>
      )}
    </section>
  );
}