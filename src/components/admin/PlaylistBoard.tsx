"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDuration } from "@/lib/time/timezone";
import type { Content, DisplayContent } from "@/lib/supabase/types";

export type PlaylistRow = DisplayContent & { content: Content };

const TYPE_LABELS = {
  image: "IMAGE",
  video: "VIDEO",
  announcement: "ANNOUNCEMENT",
} as const;

function SortableItem({
  row,
  index,
}: {
  row: PlaylistRow;
  index: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: row.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:p-4 ${
        isDragging ? "z-10 shadow-lg ring-2 ring-slate-300" : ""
      }`}
    >
      <button
        type="button"
        className="touch-none rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        aria-label="Sürükle"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-700">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-slate-900">{row.content.title}</p>
        <p className="mt-0.5 text-xs text-slate-500">
          {TYPE_LABELS[row.content.type]} · {formatDuration(row.content.duration)}
          {!row.content.active ? " · Pasif" : ""}
          {!row.active ? " · Listeden kapalı" : ""}
        </p>
      </div>
    </li>
  );
}

export function PlaylistBoard({
  displayId,
  initialRows,
}: {
  displayId: string;
  initialRows: PlaylistRow[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const ids = useMemo(() => rows.map((r) => r.id), [rows]);

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = rows.findIndex((r) => r.id === active.id);
    const newIndex = rows.findIndex((r) => r.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(rows, oldIndex, newIndex).map((r, i) => ({
      ...r,
      sort_order: i,
    }));
    setRows(next);
    setSaving(true);
    setError(null);

    const supabase = createClient();
    try {
      await Promise.all(
        next.map((r, i) =>
          supabase
            .from("display_contents")
            .update({ sort_order: i })
            .eq("id", r.id)
            .eq("display_id", displayId),
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sıra kaydedilemedi");
      setRows(initialRows);
    } finally {
      setSaving(false);
    }
  };

  if (!rows.length) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">
        Bu ekran için henüz yayın sırası yok. İçerik eklerken playlist&apos;e
        atayın.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm text-slate-500">
          Sürükleyerek sırayı değiştirin. Değişiklik anında LED ekrana yansır.
        </p>
        {saving ? (
          <span className="text-xs font-medium text-slate-500">Kaydediliyor…</span>
        ) : null}
      </div>
      {error ? (
        <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
          {error}
        </p>
      ) : null}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => void onDragEnd(e)}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ol className="space-y-2">
            {rows.map((row, index) => (
              <SortableItem key={row.id} row={row} index={index} />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
    </div>
  );
}
