import { Badge } from '../ui/Badge';
import type { InspectionResponse } from '../../types';
import { Textarea } from '../ui/Textarea';
import { Camera } from 'lucide-react';

export function ReviewItemRow({
  index,
  label,
  response,
  qaComment,
  onQaComment,
  onImageClick,
}: {
  index: number;
  label: string;
  response: InspectionResponse;
  qaComment: string;
  onQaComment: (v: string) => void;
  onImageClick: (url: string) => void;
}) {
  const hasImages = response.images.length > 0;

  return (
    <div className="border-b border-slate-100 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <span className="font-semibold text-slate-800">
          {index}. {label}
        </span>
        <div className="flex items-center gap-3">
          {hasImages && (
            <button
              onClick={() => onImageClick(response.images[0].url)}
              className="flex items-center gap-1 text-sm text-primary font-medium"
            >
              <Camera size={16} />
              <span>View {response.images.length} Image{response.images.length > 1 && 's'}</span>
            </button>
          )}
          <Badge status={response.status} />
        </div>
      </div>

      {response.remarks && (
        <div className="mt-2 rounded-md bg-slate-50 p-2 text-sm text-slate-600">
          <strong>Engineer:</strong> {response.remarks}
        </div>
      )}

      <div className="mt-3">
        <label htmlFor={`qa-comment-${response.id}`} className="mb-1 block text-xs font-semibold text-slate-500">
          QA Remark (optional)
        </label>
        <Textarea
          id={`qa-comment-${response.id}`}
          value={qaComment}
          onChange={(e) => onQaComment(e.target.value)}
          placeholder="Add a comment if there's an issue..."
          rows={2}
          className="w-full text-sm"
        />
      </div>
    </div>
  );
}
