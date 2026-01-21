import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useSignedUrl } from '@/hooks/useSignedUrl'

interface PhotoUploaderProps {
  currentPhotoUrl?: string | null
  photoPosition: { x: number; y: number; zoom?: number }
  onPhotoChange: (file: File | null) => void
  onPositionChange: (position: { x: number; y: number; zoom?: number }) => void
  onPhotoRemove?: () => void // 기존 사진 삭제 시 호출
}

export default function PhotoUploader({
  currentPhotoUrl,
  photoPosition,
  onPhotoChange,
  onPositionChange,
  onPhotoRemove,
}: PhotoUploaderProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isRemoved, setIsRemoved] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [tempPosition, setTempPosition] = useState({ x: 50, y: 50, zoom: 1 })
  const modalContainerRef = useRef<HTMLDivElement>(null)

  const { signedUrl } = useSignedUrl(currentPhotoUrl)
  const displayUrl = isRemoved ? null : (previewUrl || signedUrl)
  const currentZoom = photoPosition.zoom ?? 1

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      setIsRemoved(false)
      onPhotoChange(file)
      // 새 파일 업로드 시 모달 열기
      setTempPosition({ x: 50, y: 50, zoom: 1 })
      setIsModalOpen(true)
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
      setIsRemoved(false)
      onPhotoChange(file)
      // 새 파일 업로드 시 모달 열기
      setTempPosition({ x: 50, y: 50, zoom: 1 })
      setIsModalOpen(true)
    }
  }

  const handleRemove = () => {
    setPreviewUrl(null)
    setIsRemoved(true)
    onPhotoChange(null)
    onPhotoRemove?.()
  }

  const openEditModal = () => {
    setTempPosition({ ...photoPosition, zoom: photoPosition.zoom ?? 1 })
    setIsModalOpen(true)
  }

  // 드래그로 이미지 이동 (마우스 + 터치 지원)
  const handleDragStart = (clientX: number, clientY: number) => {
    const container = modalContainerRef.current
    if (!container) return null

    const rect = container.getBoundingClientRect()
    return {
      startX: clientX,
      startY: clientY,
      startPosX: tempPosition.x,
      startPosY: tempPosition.y,
      rect
    }
  }

  const handleDragMove = (
    clientX: number,
    clientY: number,
    dragState: { startX: number; startY: number; startPosX: number; startPosY: number; rect: DOMRect }
  ) => {
    const deltaX = clientX - dragState.startX
    const deltaY = clientY - dragState.startY

    // 드래그 방향과 이미지 이동 방향을 반대로 (자연스러운 팬 동작)
    const sensitivity = 100 / dragState.rect.width * 2
    const newX = Math.max(0, Math.min(100, dragState.startPosX - deltaX * sensitivity))
    const newY = Math.max(0, Math.min(100, dragState.startPosY - deltaY * sensitivity))

    setTempPosition(prev => ({ ...prev, x: Math.round(newX), y: Math.round(newY) }))
  }

  // 마우스 이벤트
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    const dragState = handleDragStart(e.clientX, e.clientY)
    if (!dragState) return

    const handleMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientX, e.clientY, dragState)
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  // 터치 이벤트
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return
    const touch = e.touches[0]
    const dragState = handleDragStart(touch.clientX, touch.clientY)
    if (!dragState) return

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      e.preventDefault()
      const touch = e.touches[0]
      handleDragMove(touch.clientX, touch.clientY, dragState)
    }

    const handleTouchEnd = () => {
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }

    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)
  }

  // 화살표 버튼으로 미세 조정
  const movePosition = (dx: number, dy: number) => {
    setTempPosition(prev => ({
      ...prev,
      x: Math.max(0, Math.min(100, prev.x + dx)),
      y: Math.max(0, Math.min(100, prev.y + dy))
    }))
  }

  const handleTempZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const zoom = parseFloat(e.target.value)
    setTempPosition(prev => ({ ...prev, zoom }))
  }

  const handleModalConfirm = () => {
    onPositionChange(tempPosition)
    setIsModalOpen(false)
  }

  const handleModalCancel = () => {
    setIsModalOpen(false)
  }

  return (
    <div className="space-y-3">
      <label className="label">프로필 사진</label>

      {displayUrl ? (
        <div className="space-y-3">
          {/* Thumbnail preview */}
          <div
            className="relative w-32 h-32 rounded-2xl overflow-hidden border-2 border-gray-200 cursor-pointer hover:border-blue-400 transition-colors"
            onClick={openEditModal}
            style={{
              backgroundImage: `url(${displayUrl})`,
              backgroundPosition: `${photoPosition.x}% ${photoPosition.y}%`,
              backgroundSize: `${currentZoom * 100}%`,
              backgroundRepeat: 'no-repeat',
            }}
          >
            <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center">
              <span className="material-icons text-white opacity-0 hover:opacity-100 text-2xl drop-shadow-lg">edit</span>
            </div>
          </div>

          <button
            type="button"
            onClick={openEditModal}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span className="material-icons-outlined text-sm">crop</span>
            위치/확대 조정
          </button>

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

      {/* Edit Modal - Portal to body */}
      {isModalOpen && displayUrl && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">사진 조정</h3>
              <button
                onClick={handleModalCancel}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="material-icons">close</span>
              </button>
            </div>

            {/* Large preview area */}
            <div
              ref={modalContainerRef}
              className="relative w-full aspect-square rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing border-2 border-gray-200 mb-4 touch-none select-none"
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              style={{
                backgroundImage: `url(${displayUrl})`,
                backgroundPosition: `${tempPosition.x}% ${tempPosition.y}%`,
                backgroundSize: `${tempPosition.zoom * 100}%`,
                backgroundRepeat: 'no-repeat',
                backgroundColor: '#f3f4f6',
              }}
            >
              {/* Position indicator */}
              <div
                className="absolute w-4 h-4 bg-white border-2 border-blue-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 pointer-events-none shadow-lg"
                style={{
                  left: `${tempPosition.x}%`,
                  top: `${tempPosition.y}%`,
                }}
              />
              {/* Center guide */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-0 right-0 h-px bg-white/30" />
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/30" />
              </div>
            </div>

            <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
              <span className="material-icons-outlined text-sm">pan_tool</span>
              드래그하여 사진을 이동하세요
            </p>

            {/* Arrow buttons for fine adjustment */}
            <div className="flex justify-center mb-4">
              <div className="inline-flex flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={() => movePosition(0, -5)}
                  className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                >
                  <span className="material-icons text-gray-600">keyboard_arrow_up</span>
                </button>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => movePosition(-5, 0)}
                    className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                  >
                    <span className="material-icons text-gray-600">keyboard_arrow_left</span>
                  </button>
                  <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
                    <span className="material-icons text-gray-300 text-sm">fiber_manual_record</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => movePosition(5, 0)}
                    className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                  >
                    <span className="material-icons text-gray-600">keyboard_arrow_right</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => movePosition(0, 5)}
                  className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                >
                  <span className="material-icons text-gray-600">keyboard_arrow_down</span>
                </button>
              </div>
            </div>

            {/* Zoom slider */}
            <div className="flex items-center gap-3 mb-6">
              <span className="material-icons-outlined text-sm text-gray-400">zoom_out</span>
              <input
                type="range"
                min="1"
                max="2.5"
                step="0.1"
                value={tempPosition.zoom}
                onChange={handleTempZoomChange}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <span className="material-icons-outlined text-sm text-gray-400">zoom_in</span>
              <span className="text-sm text-gray-600 w-14 text-right font-medium">
                {Math.round(tempPosition.zoom * 100)}%
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleModalCancel}
                className="btn-secondary flex-1"
              >
                취소
              </button>
              <button
                onClick={handleModalConfirm}
                className="btn-primary flex-1"
              >
                적용
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
