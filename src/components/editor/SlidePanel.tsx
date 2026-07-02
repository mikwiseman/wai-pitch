'use client';
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEditor } from '@/lib/editor-store';
import { Thumb } from '@/components/Thumb';
import { Icon } from '@/components/icons';

export function SlidePanel() {
  const deck = useEditor((s) => s.deck);
  const current = useEditor((s) => s.current);
  const goto = useEditor((s) => s.goto);
  const addSlide = useEditor((s) => s.addSlide);
  const reorderSlides = useEditor((s) => s.reorderSlides);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = deck.slides.findIndex((s) => s.id === active.id);
    const to = deck.slides.findIndex((s) => s.id === over.id);
    if (from >= 0 && to >= 0) reorderSlides(from, to);
    void arrayMove;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', borderRight: '1px solid var(--color-line)', background: 'var(--color-paper)' }}>
      <div style={{ padding: 10 }}>
        <button className="btn" onClick={() => addSlide()} style={{ width: '100%', justifyContent: 'center' }}><Icon.Plus width={16} /> Add slide</button>
      </div>
      <div style={{ overflow: 'auto', padding: '0 10px 20px', flex: 1 }}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={deck.slides.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            {deck.slides.map((s, i) => (
              <SlideRow key={s.id} id={s.id} index={i} active={i === current} onClick={() => goto(i)} />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}

function SlideRow({ id, index, active, onClick }: { id: string; index: number; active: boolean; onClick: () => void }) {
  const slide = useEditor((s) => s.deck.slides[index]);
  const duplicateSlide = useEditor((s) => s.duplicateSlide);
  const deleteSlide = useEditor((s) => s.deleteSlide);
  const count = useEditor((s) => s.deck.slides.length);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={{ ...style, display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 10 }}>
      <div style={{ width: 18, textAlign: 'right', fontSize: 12, color: 'var(--color-ink-3)', paddingTop: 20, cursor: 'grab' }} {...attributes} {...listeners}>{index + 1}</div>
      <div onClick={onClick} className="card" style={{ flex: 1, overflow: 'hidden', cursor: 'pointer', outline: active ? '2px solid var(--color-clay)' : 'none', position: 'relative' }}>
        <Thumb slide={slide} />
        <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 2, opacity: 0, transition: 'opacity 0.1s' }} className="row-actions">
          <button className="btn btn-icon" onClick={(e) => { e.stopPropagation(); duplicateSlide(index); }} title="Duplicate" style={{ height: 24, width: 24, background: 'var(--color-white)' }}><Icon.Duplicate width={13} /></button>
          {count > 1 && <button className="btn btn-icon" onClick={(e) => { e.stopPropagation(); deleteSlide(index); }} title="Delete" style={{ height: 24, width: 24, background: 'var(--color-white)' }}><Icon.Trash width={13} /></button>}
        </div>
      </div>
    </div>
  );
}
