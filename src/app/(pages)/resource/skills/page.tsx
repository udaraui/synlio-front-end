"use client";

import { useBreadcrumb } from "@/contexts/breadcrumb.context";
import { useEffect, useState } from "react";
import { SkillCategory } from "@/interfaces/skill";
import Skill_categories_list from "./components/skill_categories/categories_list";
import SkillsPanel from "./components/skill_categories/skills-panel";
import SkillLevelsPanel from "./components/skill_categories/skill-levels-panel";

function Page() {
  const { setBreadcrumbs } = useBreadcrumb();
  const [selectedCategory, setSelectedCategory] = useState<SkillCategory | null>(null);
  const [levelCategory, setLevelCategory] = useState<SkillCategory | null>(null);

  const skillsPanelOpen = !!selectedCategory;
  const levelsPanelOpen = !!levelCategory;
  const panelOpen = skillsPanelOpen || levelsPanelOpen;

  useEffect(() => {
    setBreadcrumbs([{ label: "Skill", href: "/resource/skills", isCurrentPage: true }]);
  }, [setBreadcrumbs]);

  const panel =
    skillsPanelOpen && selectedCategory ? (
      <div className="w-[580px] flex-shrink-0 flex flex-col overflow-hidden pb-0 pl-1">
        <div className="flex-1 min-h-0 overflow-x-hidden bg-white dark:bg-zinc-950 rounded-t-xl border border-border/60 border-b-0 px-5 pt-5 pb-0 flex flex-col">
          <SkillsPanel
            category={selectedCategory}
            onClose={() => setSelectedCategory(null)}
          />
        </div>
      </div>
    ) : levelsPanelOpen && levelCategory ? (
      <div className="w-[580px] flex-shrink-0 flex flex-col overflow-hidden pb-0 pl-1">
        <div className="flex-1 min-h-0 overflow-x-hidden bg-white dark:bg-zinc-950 rounded-t-xl border border-border/60 border-b-0 px-5 pt-5 pb-0 flex flex-col">
          <SkillLevelsPanel
            category={levelCategory}
            onClose={() => setLevelCategory(null)}
          />
        </div>
      </div>
    ) : null;

  return (
    <div className="flex flex-col h-full overflow-hidden pt-8">
      <Skill_categories_list
        onCategoryClick={(cat) => {
          setSelectedCategory(cat);
          setLevelCategory(null);
        }}
        onSkillLevelsClick={(cat) => {
          setLevelCategory(cat);
          setSelectedCategory(null);
        }}
        panel={panel}
        panelOpen={panelOpen}
      />
    </div>
  );
}

export default Page;
