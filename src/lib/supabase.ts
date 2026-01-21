import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
)

// 이미지 리사이즈 함수
const MAX_IMAGE_SIZE = 800 // 최대 너비/높이
const IMAGE_QUALITY = 0.85 // JPEG 품질

export const resizeImage = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    img.onload = () => {
      let { width, height } = img

      // 비율 유지하며 리사이즈
      if (width > MAX_IMAGE_SIZE || height > MAX_IMAGE_SIZE) {
        if (width > height) {
          height = (height / width) * MAX_IMAGE_SIZE
          width = MAX_IMAGE_SIZE
        } else {
          width = (width / height) * MAX_IMAGE_SIZE
          height = MAX_IMAGE_SIZE
        }
      }

      canvas.width = width
      canvas.height = height
      ctx?.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to create blob'))
          }
        },
        'image/jpeg',
        IMAGE_QUALITY
      )
    }

    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

// Storage 헬퍼 함수 - Signed URL 사용 (1시간 유효)
export const getSignedPhotoUrl = async (path: string): Promise<string | null> => {
  if (!path) return null
  if (path.startsWith('http')) return path

  const { data, error } = await supabase.storage
    .from('photos')
    .createSignedUrl(path, 3600) // 1시간 유효

  if (error) {
    console.error('Signed URL error:', error)
    return null
  }

  return data.signedUrl
}

// 동기 버전 (캐시된 URL 사용) - deprecated, 호환성 유지용
export const getPhotoUrl = (path: string) => {
  if (!path) return null
  if (path.startsWith('http')) return path
  const { data } = supabase.storage.from('photos').getPublicUrl(path)
  return data.publicUrl
}

export const uploadPhoto = async (file: File, memberId: string): Promise<string | null> => {
  try {
    // 이미지 리사이즈
    const resizedBlob = await resizeImage(file)
    const fileName = `${memberId}-${Date.now()}.jpg`
    const filePath = `members/${fileName}`

    const { error } = await supabase.storage
      .from('photos')
      .upload(filePath, resizedBlob, {
        upsert: true,
        contentType: 'image/jpeg',
      })

    if (error) {
      console.error('Upload error:', error)
      return null
    }

    return filePath
  } catch (err) {
    console.error('Resize/Upload error:', err)
    return null
  }
}

export const deletePhoto = async (path: string): Promise<boolean> => {
  const { error } = await supabase.storage
    .from('photos')
    .remove([path])

  if (error) {
    console.error('Delete error:', error)
    return false
  }

  return true
}
