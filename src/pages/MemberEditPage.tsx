import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getMember,
  getMinistryUnits,
  updateMember,
  createPrayerRequest,
  updatePrayerRequest,
  deletePrayerRequest,
} from '@/lib/api'
import { deletePhoto, uploadPhoto } from '@/lib/supabase'
import {
  formatMinistryUnitPath,
  getDefaultMemberTypeForUnit,
  sortMinistryUnits,
} from '@/lib/hierarchy'
import { getReturnToPath, hasReturnToState } from '@/lib/navigation'
import { useScrollToTopOnEnter } from '@/hooks/useScrollRestoration'
import type { MemberRole, MemberType, PrayerRequest } from '@/types'
import { MEMBER_ROLE_LABELS } from '@/types'
import Layout from '@/components/Layout'
import PhotoUploader from '@/components/PhotoUploader'
import LoadingSpinner from '@/components/LoadingSpinner'
import { ExclamationIcon, ChevronLeftIcon } from '@/components/Icons'

const usesSelectableMemberRole = (memberType: MemberType) => memberType === 'regular'

const normalizeSelectableMemberRole = (memberRole: MemberRole) =>
  memberRole === 'leader' ||
  memberRole === 'sub_leader' ||
  memberRole === 'group_leadership'
    ? memberRole
    : 'sub_leader'

export default function MemberEditPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const returnToPath = getReturnToPath(location.state, '/admin')
  const canUseHistoryBack = hasReturnToState(location.state)

  useScrollToTopOnEnter()

  const [name, setName] = useState('')
  const [memberRole, setMemberRole] = useState<MemberRole>('sub_leader')
  const [ministryUnitId, setMinistryUnitId] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPosition, setPhotoPosition] = useState<{ x: number; y: number; zoom?: number }>({
    x: 50,
    y: 50,
    zoom: 1,
  })
  const [photoRemoved, setPhotoRemoved] = useState(false)
  const [prayerRequests, setPrayerRequests] = useState<PrayerRequest[]>([])
  const [newRequest, setNewRequest] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const { data: member, isLoading: memberLoading } = useQuery({
    queryKey: ['member', id],
    queryFn: () => getMember(id!),
    enabled: !!id,
  })

  const { data: ministryUnits, isLoading: unitsLoading } = useQuery({
    queryKey: ['ministryUnits'],
    queryFn: getMinistryUnits,
  })

  useEffect(() => {
    if (member) {
      setName(member.name)
      setMemberRole(
        member.member_type === 'regular'
          ? normalizeSelectableMemberRole(member.member_role)
          : member.member_role
      )
      setMinistryUnitId(member.ministry_unit_id)
      setPhotoPosition(member.photo_position || { x: 50, y: 50, zoom: 1 })
      setPrayerRequests(member.prayer_requests || [])
      setPhotoRemoved(false)
    }
  }, [member])

  const sortedUnits = useMemo(() => {
    if (!ministryUnits) return []

    return sortMinistryUnits(ministryUnits).sort((a, b) =>
      formatMinistryUnitPath(a).localeCompare(formatMinistryUnitPath(b), 'ko')
    )
  }, [ministryUnits])

  const selectedUnit = useMemo(
    () => sortedUnits.find((unit) => unit.id === ministryUnitId) ?? null,
    [ministryUnitId, sortedUnits]
  )

  const selectedMemberType: MemberType = selectedUnit
    ? getDefaultMemberTypeForUnit(selectedUnit.unit_type)
    : 'regular'

  const updateMemberMutation = useMutation({
    mutationFn: async () => {
      if (!id) return

      let photoUrl = member?.photo_url
      const oldPhotoUrl = member?.photo_url

      if (photoRemoved && !photoFile) {
        if (oldPhotoUrl && !oldPhotoUrl.startsWith('http')) {
          await deletePhoto(oldPhotoUrl)
        }
        photoUrl = null
      } else if (photoFile) {
        if (oldPhotoUrl && !oldPhotoUrl.startsWith('http')) {
          await deletePhoto(oldPhotoUrl)
        }
        const uploadedPath = await uploadPhoto(photoFile, id)
        if (uploadedPath) {
          photoUrl = uploadedPath
        }
      }

      await updateMember(id, {
        name,
        member_type: selectedMemberType,
        member_role: usesSelectableMemberRole(selectedMemberType)
          ? normalizeSelectableMemberRole(memberRole)
          : 'member',
        ministry_unit_id: ministryUnitId,
        photo_url: photoUrl,
        photo_position: photoPosition,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
      queryClient.invalidateQueries({ queryKey: ['member', id] })
    },
  })

  const handleAddPrayerRequest = async () => {
    if (!newRequest.trim() || !id) return

    try {
      const created = await createPrayerRequest(id, newRequest.trim())
      setPrayerRequests([...prayerRequests, created])
      setNewRequest('')
      queryClient.invalidateQueries({ queryKey: ['members'] })
    } catch (error) {
      console.error('Failed to add prayer request:', error)
    }
  }

  const handleUpdatePrayerRequest = async (requestId: string, content: string) => {
    try {
      await updatePrayerRequest(requestId, content)
      setPrayerRequests(
        prayerRequests.map((request) =>
          request.id === requestId ? { ...request, content } : request
        )
      )
      queryClient.invalidateQueries({ queryKey: ['members'] })
    } catch (error) {
      console.error('Failed to update prayer request:', error)
    }
  }

  const handleDeletePrayerRequest = async (requestId: string) => {
    if (!confirm('이 기도제목을 삭제하시겠습니까?')) return

    try {
      await deletePrayerRequest(requestId)
      setPrayerRequests(prayerRequests.filter((request) => request.id !== requestId))
      queryClient.invalidateQueries({ queryKey: ['members'] })
    } catch (error) {
      console.error('Failed to delete prayer request:', error)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)

    try {
      await updateMemberMutation.mutateAsync()
      if (canUseHistoryBack) {
        navigate(-1)
      } else {
        navigate(returnToPath, { replace: true })
      }
    } catch (error) {
      console.error('Failed to save:', error)
      alert('저장에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleBack = () => {
    if (canUseHistoryBack) {
      navigate(-1)
      return
    }

    navigate(returnToPath, { replace: true })
  }

  if (memberLoading || unitsLoading) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    )
  }

  if (!member) {
    return (
      <Layout>
        <div className="text-center py-12">
          <div className="flex justify-center mb-4">
            <ExclamationIcon className="text-6xl text-gray-300" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            멤버를 찾을 수 없습니다
          </h2>
          <Link to="/" className="text-blue-600 hover:text-blue-700">
            홈으로 돌아가기
          </Link>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="mb-6">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ChevronLeftIcon className="text-lg" />
          목록으로
        </button>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">멤버 정보 수정</h1>

      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">기본 정보</h2>

        <div className="space-y-4">
          <PhotoUploader
            currentPhotoUrl={member.photo_url}
            photoPosition={photoPosition}
            onPhotoChange={setPhotoFile}
            onPositionChange={setPhotoPosition}
            onPhotoRemove={() => setPhotoRemoved(true)}
          />

          <div>
            <label className="label">이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="label">소속 단위</label>
            <select
              value={ministryUnitId}
              onChange={(e) => {
                const nextUnitId = e.target.value
                setMinistryUnitId(nextUnitId)
                const nextUnit = sortedUnits.find((unit) => unit.id === nextUnitId)
                const nextMemberType = nextUnit
                  ? getDefaultMemberTypeForUnit(nextUnit.unit_type)
                  : 'regular'

                if (!usesSelectableMemberRole(nextMemberType)) {
                  setMemberRole('member')
                } else {
                  setMemberRole((current) => normalizeSelectableMemberRole(current))
                }
              }}
              className="input"
            >
              {sortedUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {formatMinistryUnitPath(unit)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">직책</label>
            {usesSelectableMemberRole(selectedMemberType) ? (
              <select
                value={memberRole}
                onChange={(e) =>
                  setMemberRole(normalizeSelectableMemberRole(e.target.value as MemberRole))
                }
                className="input"
              >
                <option value="leader">{MEMBER_ROLE_LABELS.leader}</option>
                <option value="sub_leader">{MEMBER_ROLE_LABELS.sub_leader}</option>
                <option value="group_leadership">{MEMBER_ROLE_LABELS.group_leadership}</option>
              </select>
            ) : (
              <div className="input flex items-center text-gray-500">
                멤버 종류와 직책은 소속에 따라 자동으로 저장됩니다
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">기도제목</h2>

        <div className="mb-6">
          <textarea
            value={newRequest}
            onChange={(e) => setNewRequest(e.target.value)}
            placeholder="새 기도제목을 입력하세요"
            className="input min-h-[100px] mb-2"
          />
          <button
            type="button"
            onClick={handleAddPrayerRequest}
            disabled={!newRequest.trim()}
            className="btn-secondary text-sm"
          >
            + 기도제목 추가
          </button>
        </div>

        <div className="space-y-4">
          {prayerRequests.map((request, index) => (
            <PrayerRequestItem
              key={request.id}
              request={request}
              index={index}
              onUpdate={handleUpdatePrayerRequest}
              onDelete={handleDeletePrayerRequest}
            />
          ))}
        </div>

        {prayerRequests.length === 0 && (
          <p className="text-center text-gray-500 py-4">
            등록된 기도제목이 없습니다
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={isSaving || !name.trim() || !ministryUnitId}
          className="btn-primary flex-1"
        >
          {isSaving ? '저장 중...' : '저장하기'}
        </button>
        <button type="button" onClick={handleBack} className="btn-secondary">
          취소
        </button>
      </div>
    </Layout>
  )
}

function PrayerRequestItem({
  request,
  index,
  onUpdate,
  onDelete,
}: {
  request: PrayerRequest
  index: number
  onUpdate: (id: string, content: string) => void
  onDelete: (id: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [content, setContent] = useState(request.content)

  const handleSave = () => {
    onUpdate(request.id, content)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setContent(request.content)
    setIsEditing(false)
  }

  return (
    <div className="p-4 rounded-lg bg-gray-50">
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
          {index + 1}
        </span>
        <div className="flex-1">
          {isEditing ? (
            <div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="input min-h-[80px] mb-2"
              />
              <div className="flex gap-2">
                <button onClick={handleSave} className="btn-primary text-sm py-1">
                  저장
                </button>
                <button onClick={handleCancel} className="btn-secondary text-sm py-1">
                  취소
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-gray-700 whitespace-pre-wrap">{request.content}</p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  수정
                </button>
                <button
                  onClick={() => onDelete(request.id)}
                  className="text-sm text-red-500 hover:text-red-700"
                >
                  삭제
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
