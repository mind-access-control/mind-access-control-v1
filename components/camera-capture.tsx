"use client"

import { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Camera, X, RotateCcw, Check, AlertCircle } from "lucide-react"
import { EMPTY_STRING } from "@/lib/constants"

interface CameraCaptureProps {
  onCapture: (imageData: string) => void
  onClose: () => void
  open: boolean
}

export function CameraCapture({ onCapture, onClose, open }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cameraList, setCameraList] = useState<MediaDeviceInfo[]>([])
  const [selectedCamera, setSelectedCamera] = useState<string>(EMPTY_STRING)
  const [isLoading, setIsLoading] = useState(false)
  const [permissionStatus, setPermissionStatus] = useState<string>("unknown")

  // Initialize camera when the component mounts and dialog is open
  useEffect(() => {
    if (open) {
      checkPermissionsAndStart()
    } else {
      // Clean up when modal closes
      cleanup()
    }

    return cleanup
  }, [open])

  const cleanup = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
    setCapturedImage(null)
    setError(null)
    setIsLoading(false)
  }

  const checkPermissionsAndStart = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera access is not supported in this browser")
      }

      // Check camera permission
      if (navigator.permissions) {
        try {
          const permission = await navigator.permissions.query({ name: "camera" as PermissionName })
          setPermissionStatus(permission.state)
          console.log("Camera permission status:", permission.state)

          if (permission.state === "denied") {
            throw new Error("Camera permission denied. Please enable camera access in your browser settings.")
          }
        } catch (permErr) {
          console.log("Permission API not available, proceeding with camera request")
        }
      }

      await listCameras()
    } catch (err) {
      console.error("Error during camera initialization:", err)
      setError(err instanceof Error ? err.message : "Failed to initialize camera")
      setIsLoading(false)
    }
  }

  const listCameras = async () => {
    try {
      // First, request camera access to get device labels
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true })

      // Now get the device list with labels
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter((device) => device.kind === "videoinput")

      console.log("Available cameras:", videoDevices)
      setCameraList(videoDevices)

      // Stop the temporary stream
      tempStream.getTracks().forEach((track) => track.stop())

      if (videoDevices.length > 0) {
        setSelectedCamera(videoDevices[0].deviceId)
        await startCamera(videoDevices[0].deviceId)
      } else {
        throw new Error("No cameras found on your device")
      }
    } catch (err) {
      console.error("Error listing cameras:", err)
      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          setError(
            "Camera permission denied. Please click 'Allow' when prompted or enable camera access in your browser settings.",
          )
        } else if (err.name === "NotFoundError") {
          setError("No camera found on your device.")
        } else if (err.name === "NotReadableError") {
          setError("Camera is already in use by another application.")
        } else {
          setError(err.message)
        }
      } else {
        setError("Failed to access camera")
      }
      setIsLoading(false)
    }
  }

  const startCamera = async (deviceId?: string) => {
    try {
      setIsLoading(true)
      setError(null)

      // Stop any existing stream
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }

      console.log("Starting camera with device:", deviceId)

      // Start a new stream with the selected camera
      const constraints = {
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          facingMode: deviceId ? undefined : "user",
        },
      }

      console.log("Camera constraints:", constraints)

      const newStream = await navigator.mediaDevices.getUserMedia(constraints)
      console.log("Camera stream obtained:", newStream)

      setStream(newStream)

      if (videoRef.current) {
        videoRef.current.srcObject = newStream

        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          console.log("Video metadata loaded")
          setIsLoading(false)
        }

        videoRef.current.oncanplay = () => {
          console.log("Video can play")
          setIsLoading(false)
        }

        videoRef.current.onerror = (e) => {
          console.error("Video error:", e)
          setError("Failed to display camera feed")
          setIsLoading(false)
        }
      }
    } catch (err) {
      console.error("Error starting camera:", err)
      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          setError("Camera permission denied. Please allow camera access and try again.")
        } else if (err.name === "NotFoundError") {
          setError("Selected camera not found. Please try a different camera.")
        } else if (err.name === "NotReadableError") {
          setError("Camera is already in use by another application.")
        } else if (err.name === "OverconstrainedError") {
          setError("Camera doesn't support the requested settings.")
        } else {
          setError(err.message)
        }
      } else {
        setError("Failed to start camera")
      }
      setIsLoading(false)
    }
  }

  const switchCamera = (deviceId: string) => {
    setSelectedCamera(deviceId)
    startCamera(deviceId)
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current

      // Check if video is ready and has dimensions
      if (video.readyState !== video.HAVE_ENOUGH_DATA) {
        console.log("Video not ready yet")
        return
      }

      if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.log("Video dimensions not available")
        return
      }

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      console.log("Capturing photo with dimensions:", canvas.width, "x", canvas.height)

      // Draw the current video frame to the canvas
      const context = canvas.getContext("2d")
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height)

        // Convert canvas to data URL
        const imageData = canvas.toDataURL("image/jpeg", 0.8)
        console.log("Image captured, data length:", imageData.length)
        setCapturedImage(imageData)
      } else {
        console.error("Could not get canvas context")
      }
    } else {
      console.error("Video or canvas ref not available")
    }
  }

  const retakePhoto = () => {
    setCapturedImage(null)
  }

  const confirmPhoto = () => {
    if (capturedImage) {
      onCapture(capturedImage)
      handleClose()
    }
  }

  const handleClose = () => {
    cleanup()
    onClose()
  }

  const requestPermission = async () => {
    try {
      setError(null)
      await checkPermissionsAndStart()
    } catch (err) {
      console.error("Error requesting permission:", err)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Take Photo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Camera Error</p>
                  <p>{error}</p>
                  {error.includes("permission") && (
                    <Button variant="outline" size="sm" className="mt-2" onClick={requestPermission}>
                      Try Again
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Camera selection dropdown */}
          {cameraList.length > 1 && !capturedImage && !error && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Camera:</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                value={selectedCamera}
                onChange={(e) => switchCamera(e.target.value)}
                disabled={isLoading}
              >
                {cameraList.map((camera, index) => (
                  <option key={camera.deviceId} value={camera.deviceId}>
                    {camera.label || `Camera ${index + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Video preview or captured image */}
          <div className="relative aspect-video bg-black rounded-md overflow-hidden">
            {!capturedImage ? (
              <>
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="text-white text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                      <p className="text-sm">Initializing camera...</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <img src={capturedImage || "/placeholder.svg"} alt="Captured" className="w-full h-full object-cover" />
            )}
          </div>

          {/* Hidden canvas for capturing */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Camera controls */}
          <div className="flex justify-center gap-2">
            {!capturedImage ? (
              <Button
                type="button"
                onClick={capturePhoto}
                disabled={isLoading || !!error || !stream}
                className="bg-teal-600 hover:bg-teal-700"
              >
                <Camera className="w-4 h-4 mr-2" />
                {isLoading ? "Starting Camera..." : error ? "Camera Error" : "Capture Photo"}
              </Button>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={retakePhoto}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Retake
                </Button>
                <Button type="button" onClick={confirmPhoto} className="bg-teal-600 hover:bg-teal-700">
                  <Check className="w-4 h-4 mr-2" />
                  Use Photo
                </Button>
              </>
            )}
          </div>

          {/* Permission status info */}
          {permissionStatus === "prompt" && (
            <div className="bg-blue-50 text-blue-700 p-3 rounded-md text-sm">
              <p>Please allow camera access when prompted by your browser.</p>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-start">
          <Button type="button" variant="secondary" onClick={handleClose}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
