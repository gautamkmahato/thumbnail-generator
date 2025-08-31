"use client"

import { useState } from "react"
import {
  ImagePlus,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Film,
  Palette,
  Smile,
  Upload,
  Sparkles,
  Loader2,
} from "lucide-react"


/**
 * Fit an image inside a 1280x720 thumbnail canvas
 */
export async function fitImageToThumbnail(imageSrc) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")

      const targetWidth = 1280
      const targetHeight = 720

      canvas.width = targetWidth
      canvas.height = targetHeight

      // Fill background
      ctx.fillStyle = "#000"
      ctx.fillRect(0, 0, targetWidth, targetHeight)

      // Scale to fit inside canvas
      const scale = Math.min(targetWidth / img.width, targetHeight / img.height)
      const newWidth = img.width * scale
      const newHeight = img.height * scale

      // Center
      const x = (targetWidth - newWidth) / 2
      const y = (targetHeight - newHeight) / 2

      ctx.drawImage(img, x, y, newWidth, newHeight)

      resolve(canvas.toDataURL("image/png"))
    }
    img.onerror = reject
    img.src = imageSrc
  })
}

/**
 * Check if image aspect ratio is close to 16:9
 */
function isCloseToThumbnailAspect(width, height, tolerance = 0.05) {
  const actualRatio = width / height
  const targetRatio = 16 / 9
  return Math.abs(actualRatio - targetRatio) < tolerance
}


export default function Home() {
  const [imageBase64, setImageBase64] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [query, setQuery] = useState("")
  const [position, setPosition] = useState("center")
  const [videoType, setVideoType] = useState("educational")
  const [style, setStyle] = useState("minimal")
  const [mood, setMood] = useState("serious")
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState(null)

  /* ------------------ Convert uploaded image to base64 ------------------ */
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    console.log("[📂] Image selected:", file.name)
    const reader = new FileReader()

    reader.onloadend = async () => {
      const result = reader.result

      const img = new Image()
      img.onload = async () => {
        let finalBase64

        if (isCloseToThumbnailAspect(img.width, img.height)) {
          console.log("[ℹ️] Aspect ratio close to 16:9 → using original image")
          finalBase64 = result.split(",")[1]
        } else {
          console.log("[ℹ️] Aspect ratio far from 16:9 → converting to 1280x720")
          const adjusted = await fitImageToThumbnail(result)
          finalBase64 = adjusted.split(",")[1]
        }

        setImageBase64(finalBase64)
        setImagePreview(URL.createObjectURL(file)) // still preview raw uploaded
        console.log("[✅] Final Base64 prepared (length):", finalBase64.length)
      }
      img.src = result
    }

    reader.readAsDataURL(file)
  }

  /* ------------------ Submit Flow ------------------ */
  const handleSubmit = async () => {
    if (!imageBase64 || !query.trim()) {
      alert("Please upload an image and enter text.")
      return
    }

    setLoading(true)
    setResponse(null)

    try {
      console.log("[🔵] Step 1: Uploading image to Cloudinary...")

      const saveRes = await fetch("/api/save-to-cloudinary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64: imageBase64,
          fileName: `upload_${Date.now()}.png`,
        }),
      })

      const saveData = await saveRes.json()
      if (!saveRes.ok) throw new Error(saveData.error || "Failed to upload to Cloudinary")
      console.log("[✅] Image uploaded. Cloudinary URL:", saveData.cloudinaryUrl)

      console.log("[🔵] Step 2: Calling /api/generate with image + metadata...")

      const genRes = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: saveData.cloudinaryUrl,
          query,
          position,
          videoType,
          style,
          mood,
        }),
      })

      
      if (genRes.status === 401) {
        window.location.href = "/login";
        return;
      }

      const genData = await genRes.json()
      if (!genRes.ok) throw new Error(genData.error || "Failed to generate image")

      console.log("[✅] Generate API response:", genData)
      setResponse(genData)
    } catch (err) {
      console.error("[❌] Error in handleSubmit:", err)
      alert(err.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  /* ------------------ UI ------------------ */
  return (
    <main className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/70 backdrop-blur border-b">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-b from-gray-600 to-gray-900 text-white grid place-items-center">
              <Sparkles size={18} />
            </div>
            <h1 className="text-xl md:text-2xl font-semibold text-gray-900 text-balance">AI Thumbnail Generator</h1>
          </div>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-b from-gray-600 to-gray-900 px-4 py-2 text-white font-medium hover:bg-gray-700 disabled:opacity-50"
            aria-busy={loading}
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
            {loading ? "Processing..." : "Generate"}
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-6 md:py-10">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* LEFT: Inputs (40%) */}
          <aside className="md:col-span-2 space-y-6">
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Inputs</h2>

              {/* Image Upload */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <ImagePlus size={18} className="text-gray-600" />
                  Upload Image
                </label>
                <label
                  htmlFor="file-upload"
                  className="flex items-center justify-between gap-3 w-full rounded-lg border border-dashed p-3 cursor-pointer hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-md bg-blue-50 text-blue-700 grid place-items-center">
                      <Upload size={16} />
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium text-gray-800">Click to upload</span> or drag and drop
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">PNG, JPG</span>
                </label>
                <input id="file-upload" type="file" accept="image/*" onChange={handleImageUpload} className="sr-only" />
              </div>

              {/* Query */}
              <div className="mt-5 space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Type size={18} className="text-blue-600" />
                  Text
                </label>
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter your thumbnail text..."
                  rows={4}
                  className="w-full rounded-lg border p-3 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              {/* Position */}
              <div className="mt-5 space-y-2">
                <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <AlignCenter size={18} className="text-blue-600" />
                  Photo Position
                </span>
                <div className="mt-1 grid grid-cols-3 gap-2">
                  {[
                    { key: "left", icon: <AlignLeft size={16} /> },
                    { key: "center", icon: <AlignCenter size={16} /> },
                    { key: "right", icon: <AlignRight size={16} /> },
                  ].map((opt) => (
                    <label
                      key={opt.key}
                      className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer ${
                        position === opt.key ? "border-blue-600 bg-blue-50 text-blue-700" : "hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="radio"
                        value={opt.key}
                        checked={position === opt.key}
                        onChange={() => setPosition(opt.key)}
                        className="sr-only"
                      />
                      {opt.icon}
                      <span className="capitalize">{opt.key}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Video Type */}
              <div className="mt-5 space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Film size={18} className="text-blue-600" />
                  Video Type
                </label>
                <select
                  value={videoType}
                  onChange={(e) => setVideoType(e.target.value)}
                  className="w-full rounded-lg border p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                >
                  <option value="educational">Educational</option>
                  <option value="tutorial">Tech Tutorial</option>
                  <option value="sports">Others (Eg: Sports, Adventure, Blogging, Review, etc)</option>
                </select>
              </div>

              {/* Style */}
              {/* <div className="mt-5 space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Palette size={18} className="text-blue-600" />
                  Style (optional)
                </label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="w-full rounded-lg border p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                >
                  <option value="minimal">Minimal & Clean</option>
                  <option value="bold">Bold & Eye-catching</option>
                  <option value="professional">Professional & Modern</option>
                  <option value="fun">Fun & Playful</option>
                  <option value="before after">Before / After</option>
                </select>
              </div> */}

              {/* Mood */}
              {/* <div className="mt-5 space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Smile size={18} className="text-blue-600" />
                  Mood
                </label>
                <select
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                  className="w-full rounded-lg border p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                >
                  <option value="serious">Serious & Informative</option>
                  <option value="exciting">Exciting & Energetic</option>
                  <option value="friendly">Friendly & Approachable</option>
                  <option value="dramatic">Dramatic & Intense</option>
                </select>
              </div> */}

              <div className="mt-6">
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-gray-600 to-gray-900 px-4 py-2.5 text-white font-medium hover:bg-gray-700 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                  {loading ? "Processing..." : "Generate"}
                </button>
              </div>
            </div>
          </aside>

          {/* RIGHT: Preview + Response (60%) */}
          <section className="md:col-span-3 space-y-6">
            {/* Preview */}
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Preview</h2>
                {imagePreview && <span className="text-xs text-gray-500">Local preview (not uploaded yet)</span>}
              </div>

              {!imagePreview ? (
                <div className="grid place-items-center h-[340px] rounded-lg border border-dashed bg-gray-50">
                  <div className="text-center px-6">
                    <div className="mx-auto mb-3 h-10 w-10 rounded-lg bg-blue-50 text-gray-700 grid place-items-center">
                      <ImagePlus size={20} />
                    </div>
                    <p className="text-sm text-gray-700 font-medium">No image selected</p>
                    <p className="text-xs text-gray-500 mt-1">Upload an image to see the preview here</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <img
                    src={imagePreview || "/placeholder.svg"}
                    alt="Selected preview"
                    className="w-full max-w-xl aspect-video object-cover rounded-lg border"
                  />
                </div>
              )}
            </div>

            {/* Response */}
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Response</h2>

              {!response ? (
                loading ? (
                  <div className="flex flex-col items-center gap-3 p-6">
                    <Loader2 className="animate-spin text-blue-600" size={28} />
                    <p className="text-sm text-gray-600">Generating thumbnails...</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">Run Generate to see the API response and any generated image.</p>
                )
              ) : (
                <div className="space-y-3">
                  {/* <pre className="max-h-64 overflow-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-700 border">
                    {JSON.stringify(response, null, 2)}
                  </pre> */}

                  {response.results && response.results.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {response.results.map((res, idx) => (
                        <div key={idx} className="space-y-2">
                          <h3 className="text-sm font-medium text-gray-800">Generated Image {idx + 1}</h3>
                          <img
                            src={res.geminiResult || "/placeholder.svg"}
                            alt={`Generated ${idx + 1}`}
                            className="w-full aspect-video object-cover rounded-lg border"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}
