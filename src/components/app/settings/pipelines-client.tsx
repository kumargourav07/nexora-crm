"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Kanban,
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Settings,
  Sparkles,
  Check,
  X,
  Layers,
} from "lucide-react";
import {
  getPipelinesAction,
  createPipelineAction,
  updatePipelineAction,
  deletePipelineAction,
  createStageAction,
  updateStageAction,
  deleteStageAction,
  reorderStagesAction,
} from "@/lib/actions/pipelines-actions";

interface PipelineStageData {
  id: string;
  name: string;
  order: number;
  probability: number;
  color: string | null;
  isWon: boolean;
  isLost: boolean;
  dealCount: number;
}

interface PipelineData {
  id: string;
  name: string;
  isDefault: boolean;
  dealCount: number;
  stages: PipelineStageData[];
}

const STAGE_COLORS = [
  "#3B82F6", // Blue
  "#6366F1", // Indigo
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#F59E0B", // Amber
  "#0EA5E9", // Sky
  "#10B981", // Emerald
  "#EF4444", // Red
  "#64748B", // Slate
];

export function PipelinesSettingsClient() {
  const [pipelines, setPipelines] = useState<PipelineData[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Pipeline Modal
  const [isNewPipelineOpen, setIsNewPipelineOpen] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState("");
  const [newPipelineDefault, setNewPipelineDefault] = useState(false);
  const [isCreatingPipeline, setIsCreatingPipeline] = useState(false);

  // Add Stage State
  const [isAddingStage, setIsAddingStage] = useState(false);
  const [stageName, setStageName] = useState("");
  const [stageProbability, setStageProbability] = useState<number>(50);
  const [stageColor, setStageColor] = useState(STAGE_COLORS[0]);
  const [stageIsWon, setStageIsWon] = useState(false);
  const [stageIsLost, setStageIsLost] = useState(false);
  const [isSubmittingStage, setIsSubmittingStage] = useState(false);

  // Edit Stage State
  const [editingStage, setEditingStage] = useState<PipelineStageData | null>(null);

  const loadPipelines = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getPipelinesAction();
      if (!res.success) {
        setError(res.error || "Failed to load pipelines");
      } else if (res.data?.pipelines) {
        setPipelines(res.data.pipelines as PipelineData[]);
        if (!selectedPipelineId && res.data.pipelines.length > 0) {
          const def = res.data.pipelines.find((p) => p.isDefault) || res.data.pipelines[0];
          setSelectedPipelineId(def.id);
        }
      }
    } catch {
      setError("Unable to connect to database");
    } finally {
      setIsLoading(false);
    }
  }, [selectedPipelineId]);

  useEffect(() => {
    loadPipelines();
  }, [loadPipelines]);

  const activePipeline = pipelines.find((p) => p.id === selectedPipelineId) || pipelines[0];

  const handleCreatePipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPipelineName.trim()) return;
    setIsCreatingPipeline(true);
    try {
      const res = await createPipelineAction({
        name: newPipelineName.trim(),
        isDefault: newPipelineDefault,
      });
      if (res.success && res.data?.id) {
        setNewPipelineName("");
        setNewPipelineDefault(false);
        setIsNewPipelineOpen(false);
        setSelectedPipelineId(res.data.id);
        loadPipelines();
      } else {
        alert(res.error || "Failed to create pipeline");
      }
    } finally {
      setIsCreatingPipeline(false);
    }
  };

  const handleDeletePipeline = async (id: string) => {
    const pipe = pipelines.find((p) => p.id === id);
    if (!pipe) return;
    if (!confirm(`Are you sure you want to delete pipeline "${pipe.name}"?`)) return;

    try {
      const res = await deletePipelineAction(id);
      if (res.success) {
        setSelectedPipelineId("");
        loadPipelines();
      } else {
        alert(res.error || "Failed to delete pipeline");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageName.trim() || !activePipeline) return;
    setIsSubmittingStage(true);
    try {
      const nextOrder = activePipeline.stages.length;
      const res = await createStageAction({
        pipelineId: activePipeline.id,
        name: stageName.trim(),
        order: nextOrder,
        probability: Number(stageProbability) || 0,
        color: stageColor,
        isWon: stageIsWon,
        isLost: stageIsLost,
      });
      if (res.success) {
        setStageName("");
        setStageProbability(50);
        setStageIsWon(false);
        setStageIsLost(false);
        setIsAddingStage(false);
        loadPipelines();
      } else {
        alert(res.error || "Failed to create stage");
      }
    } finally {
      setIsSubmittingStage(false);
    }
  };

  const handleUpdateStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStage) return;
    try {
      const res = await updateStageAction({
        id: editingStage.id,
        name: editingStage.name.trim(),
        probability: Number(editingStage.probability) || 0,
        color: editingStage.color || STAGE_COLORS[0],
        isWon: editingStage.isWon,
        isLost: editingStage.isLost,
      });
      if (res.success) {
        setEditingStage(null);
        loadPipelines();
      } else {
        alert(res.error || "Failed to update stage");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteStage = async (stageId: string) => {
    if (!confirm("Are you sure you want to delete this stage?")) return;
    try {
      const res = await deleteStageAction(stageId);
      if (res.success) {
        loadPipelines();
      } else {
        alert(res.error || "Failed to delete stage");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMoveStage = async (index: number, direction: "up" | "down") => {
    if (!activePipeline) return;
    const stages = [...activePipeline.stages];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stages.length) return;

    const temp = stages[index];
    stages[index] = stages[targetIndex];
    stages[targetIndex] = temp;

    const newStageIds = stages.map((s) => s.id);
    try {
      const res = await reorderStagesAction({
        pipelineId: activePipeline.id,
        stageIds: newStageIds,
      });
      if (res.success) {
        loadPipelines();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs text-muted-foreground font-mono">Loading pipelines configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Sales Pipeline & Stage Settings</h2>
          <p className="text-xs text-muted-foreground">
            Customize sales pipelines, stages, probabilities, and terminal won/lost properties.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsNewPipelineOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-sm shadow-primary/25 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Pipeline</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-xs text-destructive">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Pipeline Selector & Stages Manager */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Pipelines List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Workspace Pipelines ({pipelines.length})
          </h3>

          <div className="space-y-2">
            {pipelines.map((p) => {
              const isSelected = p.id === (activePipeline?.id || "");
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPipelineId(p.id)}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border bg-surface hover:bg-surface-elevated"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-foreground">{p.name}</span>
                      {p.isDefault && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {p.stages.length} stages • {p.dealCount} deals
                    </p>
                  </div>

                  {!p.isDefault && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePipeline(p.id);
                      }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Delete pipeline"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Active Pipeline Stages (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {activePipeline && (
            <div className="bg-surface border border-border rounded-2xl p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Kanban className="w-4 h-4 text-primary" />
                    <span>{activePipeline.name} Stages</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Define stage order, default win probability, and visual tags.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddingStage(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface-elevated text-xs font-semibold text-foreground hover:border-primary/50 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-primary" />
                  <span>Add Stage</span>
                </button>
              </div>

              {/* Add Stage Form */}
              {isAddingStage && (
                <form
                  onSubmit={handleAddStage}
                  className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3 animate-in fade-in-0"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Create Stage</span>
                    <button
                      type="button"
                      onClick={() => setIsAddingStage(false)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-foreground mb-1">
                        Stage Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Contract Sent"
                        value={stageName}
                        onChange={(e) => setStageName(e.target.value)}
                        className="w-full rounded-xl border border-border bg-surface px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-foreground mb-1">
                        Default Prob (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={stageProbability}
                        onChange={(e) => setStageProbability(Number(e.target.value))}
                        className="w-full rounded-xl border border-border bg-surface px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  {/* Color Picker & Properties */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-muted-foreground">Color:</span>
                      <div className="flex items-center gap-1.5">
                        {STAGE_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setStageColor(c)}
                            className={`w-5 h-5 rounded-full border transition-all ${
                              stageColor === c ? "ring-2 ring-primary scale-110" : ""
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={stageIsWon}
                          onChange={(e) => {
                            setStageIsWon(e.target.checked);
                            if (e.target.checked) setStageIsLost(false);
                          }}
                          className="rounded"
                        />
                        <span className="text-emerald-400 font-semibold">Won Stage</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={stageIsLost}
                          onChange={(e) => {
                            setStageIsLost(e.target.checked);
                            if (e.target.checked) setStageIsWon(false);
                          }}
                          className="rounded"
                        />
                        <span className="text-rose-400 font-semibold">Lost Stage</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingStage(false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-surface"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingStage}
                      className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90"
                    >
                      {isSubmittingStage ? "Saving..." : "Add Stage"}
                    </button>
                  </div>
                </form>
              )}

              {/* Stages List */}
              <div className="space-y-2.5">
                {activePipeline.stages.map((stage, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === activePipeline.stages.length - 1;
                  const isEditing = editingStage?.id === stage.id;

                  if (isEditing) {
                    return (
                      <form
                        key={stage.id}
                        onSubmit={handleUpdateStage}
                        className="p-3.5 rounded-xl border border-primary/40 bg-surface-elevated space-y-3"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            required
                            value={editingStage.name}
                            onChange={(e) =>
                              setEditingStage({ ...editingStage, name: e.target.value })
                            }
                            className="sm:col-span-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground"
                          />
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={editingStage.probability}
                            onChange={(e) =>
                              setEditingStage({
                                ...editingStage,
                                probability: Number(e.target.value),
                              })
                            }
                            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground"
                          />
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-1.5">
                            {STAGE_COLORS.map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => setEditingStage({ ...editingStage, color: c })}
                                className={`w-4 h-4 rounded-full ${
                                  editingStage.color === c ? "ring-2 ring-primary scale-110" : ""
                                }`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingStage(null)}
                              className="px-2.5 py-1 text-xs text-muted-foreground hover:bg-surface rounded-lg"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="px-3 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      </form>
                    );
                  }

                  return (
                    <div
                      key={stage.id}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-surface-elevated border border-border text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: stage.color || "#3B82F6" }}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">{stage.name}</span>
                            {stage.isWon && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Won Stage
                              </span>
                            )}
                            {stage.isLost && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                Lost Stage
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                            Default Probability: {stage.probability}% • {stage.dealCount} deals
                          </p>
                        </div>
                      </div>

                      {/* Controls: Reorder, Edit, Delete */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={isFirst}
                          onClick={() => handleMoveStage(idx, "up")}
                          className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-20"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={isLast}
                          onClick={() => handleMoveStage(idx, "down")}
                          className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-20"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingStage(stage)}
                          className="p-1 rounded text-muted-foreground hover:text-foreground ml-1"
                          title="Edit Stage"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={stage.dealCount > 0}
                          onClick={() => handleDeleteStage(stage.id)}
                          className="p-1 rounded text-muted-foreground hover:text-destructive disabled:opacity-20 ml-0.5"
                          title={stage.dealCount > 0 ? "Cannot delete stage with deals" : "Delete Stage"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Pipeline Modal */}
      {isNewPipelineOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in-0">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Create Sales Pipeline</h3>
                <p className="text-xs text-muted-foreground">Add a new workflow pipeline for opportunities</p>
              </div>
            </div>

            <form onSubmit={handleCreatePipeline} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Pipeline Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Enterprise Sales Pipeline"
                  value={newPipelineName}
                  onChange={(e) => setNewPipelineName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={newPipelineDefault}
                  onChange={(e) => setNewPipelineDefault(e.target.checked)}
                  className="rounded"
                />
                <span>Set as default pipeline for workspace</span>
              </label>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewPipelineOpen(false)}
                  disabled={isCreatingPipeline}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingPipeline}
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                >
                  {isCreatingPipeline ? "Creating..." : "Create Pipeline"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
