"use client";

import React from "react";
import { XIcon, Layers } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { SkillCategory } from "@/interfaces/skill";
import Skill_list from "../skills/skill_list";

interface SkillsPanelProps {
  category: SkillCategory;
  onClose: () => void;
}

const SkillsPanel: React.FC<SkillsPanelProps> = ({ category, onClose }) => {
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="-mx-5 -mt-5 px-4 pt-3 pb-2 bg-gray-50 dark:bg-gray-900 border-b border-border flex justify-between items-start">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold">{category.name}</p>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-border text-xs font-medium text-foreground/70">
                <span
                  className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                    category.isActive
                      ? "bg-green-500 dark:bg-green-400"
                      : "bg-red-400 dark:bg-red-500"
                  }`}
                />
                {category.isActive ? "Active" : "Inactive"}
              </div>
            </div>
            <div className="mt-1 space-y-0.5">
              {category.description && (
                <p className="text-xs text-muted-foreground">
                  {category.description}
                </p>
              )}
              {/* -- METADATA --------------------------------------- */}
              {(category.createdAt || category.updatedAt) && (
                <div className="pt-2 flex flex-wrap items-center gap-x-4">
                  {category.createdAt && (
                    <p className="text-xs font-medium text-muted-foreground/70">
                      Created{category.createdBy && <> by <span className="text-primary">{category.createdBy}</span></>}, {new Date(category.createdAt).toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                    </p>
                  )}
                  {category.updatedAt && (
                    <p className={`text-xs font-medium text-muted-foreground/70 ${!category.updatedBy ? 'hidden' : ''}`}>
                      Updated{category.updatedBy && <> by <span className="text-primary">{category.updatedBy}</span></>}, {new Date(category.updatedAt).toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="ml-2 flex-shrink-0 h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Skills list */}
      <div className="pt-4 pb-0 flex-1 min-h-0 flex flex-col">
        <p className="text-xs font-semibold text-muted-foreground mb-3 flex-none">
          Skills
        </p>
        <div className="flex-1 min-h-0 flex flex-col -mx-5 px-5">
          <Skill_list skillCategoryId={category.id} />
        </div>
      </div>
    </div>
  );
};

export default SkillsPanel;
