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
    <div className="slide-panel">
      <div className="slide-panel-header">
        <button className="btn slide-add-button" onClick={() => addSlide()}><Icon.Plus width={15} /> Add frame</button>
      </div>
      <div className="slide-list">
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
    <div ref={setNodeRef} className="slide-row" style={style}>
      <div className="slide-number" aria-label={`Reorder frame ${index + 1}`} {...attributes} {...listeners}>{String(index + 1).padStart(2, '0')}</div>
      <div onClick={onClick} className={`slide-thumb-card${active ? ' is-active' : ''}`}>
        <Thumb slide={slide} />
        <div className="slide-row-actions">
          <button className="btn btn-icon" onClick={(e) => { e.stopPropagation(); duplicateSlide(index); }} title="Duplicate" aria-label={`Duplicate frame ${index + 1}`} style={{ background: 'var(--color-white)' }}><Icon.Duplicate width={13} /></button>
          {count > 1 && <button className="btn btn-icon" onClick={(e) => { e.stopPropagation(); deleteSlide(index); }} title="Delete" aria-label={`Delete frame ${index + 1}`} style={{ background: 'var(--color-white)' }}><Icon.Trash width={13} /></button>}
        </div>
      </div>
    </div>
  );
}
