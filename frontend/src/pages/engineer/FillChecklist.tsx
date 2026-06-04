import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { DEFAULT_CHECKLIST_CATEGORIES } from '../../constants/checklist';
import { useInspection } from '../../hooks/useInspection';
import { ChecklistCategory } from '../../components/inspection/ChecklistCategory';
import { SubmitBar } from '../../components/inspection/SubmitBar';
import { ROUTES } from '../../constants/routes';
import { imagesApi } from '../../utils/api';
import type { InspectionResponse, SnagImage } from '../../types';
import { Spinner } from '../../components/ui/Spinner';
import { cn } from '../../utils/cn';

export default function FillChecklist() {
  const { flatId, categoryId } = useParams<{ flatId: string; categoryId: string }>();
  const navigate = useNavigate();
  
  const catIndex = DEFAULT_CHECKLIST_CATEGORIES.findIndex(
    (c) => c.id === (categoryId || 'civil')
  );
  const category = DEFAULT_CHECKLIST_CATEGORIES[catIndex >= 0 ? catIndex : 0];
  
  const { inspection, loading, saveResponses, setInspection } = useInspection(flatId);

  const handleChange = useCallback(
    (itemId: string, patch: Partial<InspectionResponse>) => {
      if (!inspection) return;
      const responses = inspection.responses.map((r) =>
        r.itemId === itemId
          ? { ...r, ...patch, updatedAt: new Date().toISOString() }
          : r
      );
      setInspection({ ...inspection, responses });
    },
    [inspection, setInspection]
  );

  // Auto-save periodically
  useEffect(() => {
    if (!inspection) return;
    const timer = setInterval(() => saveResponses(inspection.responses), 30000);
    return () => {
      clearInterval(timer);
      // Save on unmount
      saveResponses(inspection.responses);
    };
  }, [inspection, saveResponses]);

  const handleImageAdd = async (
    responseId: string,
    file: File,
    preview: string
  ) => {
    // This function seems complex and works, so I'll leave it as is.
    // The responsiveness changes are mainly in the layout.
    if (!inspection) return;
    const img: SnagImage = {
      id: crypto.randomUUID(),
      inspectionId: inspection.id,
      responseId,
      type: 'evidence',
      url: preview,
      caption: '',
      uploadedAt: new Date().toISOString(),
      isLocal: true,
      localBlob: preview,
    };
    if (navigator.onLine) {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('inspectionId', inspection.id);
      fd.append('responseId', responseId);
      fd.append('type', 'evidence');
      try {
        const { data } = await imagesApi.upload(fd);
        img.url = data.url;
        img.thumbnailUrl = data.thumbnailUrl;
        img.isLocal = false;
      } catch {
        /* keep local */
      }
    }
    const responses = inspection.responses.map((r) =>
      r.id === responseId ? { ...r, images: [...r.images, img] } : r
    );
    setInspection({ ...inspection, responses });
  };

  const handleImageRemove = (responseId: string, imageId: string) => {
    if (!inspection) return;
    const responses = inspection.responses.map((r) =>
      r.id === responseId
        ? { ...r, images: r.images.filter((i) => i.id !== imageId) }
        : r
    );
    setInspection({ ...inspection, responses });
  };

  if (loading || !inspection) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const catResponses = inspection.responses.filter(
    (r) => r.categoryId === category.id
  );
  const done = catResponses.filter((r) => r.status !== 'pending').length;
  const isLast = catIndex === DEFAULT_CHECKLIST_CATEGORIES.length - 1;
  const nextCat = DEFAULT_CHECKLIST_CATEGORIES[catIndex + 1];

  return (
    <div className="pb-28 md:pb-0">
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 p-4 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(ROUTES.ENGINEER_FLAT(flatId!))}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary"
          >
            <ArrowLeft size={18} />
            <span className="hidden sm:inline">Back to Details</span>
          </button>
          <div className="text-center">
            <h1 className="text-lg font-bold text-slate-900">{category.name}</h1>
            <p className="text-sm font-semibold text-slate-500">
              {done} / {category.items.length} items
            </p>
          </div>
          {/* Placeholder for equal spacing */}
          <div className="w-16 sm:w-32" />
        </div>
      </div>

      <div className="p-4">
        <ChecklistCategory
          category={category}
          responses={catResponses}
          onChange={handleChange}
          onImageAdd={handleImageAdd}
          onImageRemove={handleImageRemove}
        />
      </div>

      <SubmitBar
        onNext={() => {
          saveResponses(inspection.responses);
          navigate(ROUTES.ENGINEER_CHECKLIST(flatId!, nextCat.id));
        }}
        onSummary={() => {
          saveResponses(inspection.responses);
          navigate(ROUTES.ENGINEER_INSPECTION_SUMMARY(flatId!));
        }}
        isLastCategory={isLast}
        isComplete={done === category.items.length}
      />
    </div>
  );
}
