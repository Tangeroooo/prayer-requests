import { useState, useRef, useCallback } from 'react'
import { useSignedUrl } from '@/hooks/useSignedUrl'

interface PhotoUploaderProps {
  currentPhotoUrl?: string | null
  photoPosition: { x: number; y: number }
  onPhotoChange: (file: File | null) => void
  onPositionChange: (position: { x: number; y: number }) => void
}

export default function PhotoUploader({
  currentPhotoUrl,
  photoPosition,
  onPhotoChange,
  onPositionChange,
}: PhotoUploaderProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isAdjusting, setIsAdjusting] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const { signedUrl } = useSignedUrl(currentPhotoUrl)
  const displayUrl = previewUrl || signedUrl

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      onPhotoChange(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      onPhotoChange(file)
    }
  }

  const handlePositionMouseDown = useCallback((e: React.MouseEvent) => {
    if (!displayUrl) return
    e.preventDefault()
    setIsAdjusting(true)

    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()

    const updatePosition = (clientX: number, clientY: number) => {
      const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
      const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100))
      onPositionChange({ x: Math.round(x), y: Math.round(y) })
    }

    const handleMouseMove = (e: MouseEvent) => {
      updatePosition(e.clientX, e.clientY)
    }

    const handleMouseUp = () => {
      setIsAdjusting(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    updatePosition(e.clientX, e.clientY)
  }, [displayUrl, onPositionChange])

  const handleRemove = () => {
    setPreviewUrl(null)
    onPhotoChange(null)
  }

  return (
    <div className="space-y-3">
      <label className="label">프로필 사진</label>

      {displayUrl ? (
        <div className="space-y-3">
          {/* Preview with position adjustment */}
          <div
            ref={containerRef}
            className={`relative w-32 h-32 rounded-2xl overflow-hidden cursor-crosshair border-2 ${
              isAdjusting ? 'border-blue-400' : 'border-gray-200'
            }`}
            onMouseDown={handlePositionMouseDown}
            style={{
              backgroundImage: `url(${displayUrl})`,
              backgroundPosition: `${photoPosition.x}% ${photoPosition.y}%`,
              backgroundSize: 'cover',
            }}
          >
            {/* Position indicator */}
            <div
              className="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 pointer-events-none shadow-md"
              style={{
                left: `${photoPosition.x}%`,
                top: `${photoPosition.y}%`,
              }}
            />
          </div>

          <p className="text-xs text-gray-500 flex items-center gap-1">
            <span className="material-icons-outlined text-sm">touch_app</span>
            클릭하거나 드래그하여 사진 위치를 조정하세요
          </p>

          <button
            type="button"
            onClick={handleRemove}
            className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
          >
            <span className="material-icons-outlined text-sm">delete</span>
            사진 삭제
          </button>
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-2xl p-6 text-center transition-colors ${
            isDragging
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="text-gray-400 mb-3">
            <span className="material-icons-outlined text-4xl">add_photo_alternate</span>
          </div>
          <p className="text-sm text-gray-500 mb-3">
            이미지를 드래그하거나 클릭하여 업로드
          </p>
          <label className="btn-secondary text-sm cursor-pointer inline-flex items-center gap-1">
            <span className="material-icons-outlined text-lg">upload</span>
            파일 선택
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
          <p className="text-xs text-gray-400 mt-3">
            최대 800px로 자동 리사이즈됩니다
          </p>
        </div>
      )}
    </div>
  )
}
