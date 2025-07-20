'use client';

import { useState, useRef, ChangeEvent, useEffect } from 'react';
import Image from 'next/image';
import { Camera, Upload, Zap, Eye, Target, Sparkles, Info, X, CheckCircle } from 'lucide-react';

interface Detection {
  class_name: string;
  confidence: number;
  bounding_box: [number, number, number, number];
}

const COCO_CLASSES = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
  'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
  'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
  'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
  'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
  'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
  'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake',
  'chair', 'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop',
  'mouse', 'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink',
  'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'
];

export default function VisioDetect() {
  const [image, setImage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [loading, setLoading] = useState(false);
  const [showClasses, setShowClasses] = useState(false);
  const [animateDetections, setAnimateDetections] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (detections.length > 0) {
      setTimeout(() => setAnimateDetections(true), 100);
    } else {
      setAnimateDetections(false);
    }
  }, [detections]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const processFile = (selectedFile: File) => {
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
      setDetections([]);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files[0] && files[0].type.startsWith('image/')) {
      processFile(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleUploadAreaClick = () => {
    fileInputRef.current?.click();
  };

  const handlePredictClick = async () => {
    if (!file) return;

    setLoading(true);
    setDetections([]);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/predict', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Prediction failed');
      }

      const data = await response.json();
      setDetections(data.detections);
    } catch (error) {
      console.error('Error:', error);
      // You could add error state handling here
    } finally {
      setLoading(false);
    }
  };

  const getBoundingBoxStyle = (box: [number, number, number, number], index: number) => {
    if (!imageRef.current) return {};
    const { naturalWidth, naturalHeight, offsetWidth, offsetHeight } = imageRef.current;
    const widthScale = offsetWidth / naturalWidth;
    const heightScale = offsetHeight / naturalHeight;

    const [xmin, ymin, xmax, ymax] = box;
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff'];

    return {
      left: `${xmin * widthScale}px`,
      top: `${ymin * heightScale}px`,
      width: `${(xmax - xmin) * widthScale}px`,
      height: `${(ymax - ymin) * heightScale}px`,
      borderColor: colors[index % colors.length],
      opacity: animateDetections ? 1 : 0,
      transform: animateDetections ? 'scale(1)' : 'scale(0.8)',
    };
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-400';
    if (confidence >= 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans">
      {/* Header */}
      <header className="bg-gray-800/30 backdrop-blur-lg border-b border-gray-700/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Eye className="w-8 h-8 text-blue-400" />
            <h1 className="text-2xl font-bold text-white">Visio</h1>
          </div>
          <button
            onClick={() => setShowClasses(!showClasses)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 rounded-full transition-all duration-300 group"
          >
            <Info className="w-5 h-5" />
            <span>Detectable Classes</span>
          </button>
        </div>
      </header>

      {/* Classes Modal */}
      {showClasses && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800/90 backdrop-blur-xl border border-gray-700 rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-700">
              <h3 className="text-xl font-bold text-white flex items-center gap-3">
                <Target className="w-6 h-6 text-blue-400" />
                Detectable Object Classes
              </h3>
              <button
                onClick={() => setShowClasses(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-all duration-200"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {COCO_CLASSES.map((className, index) => (
                  <div
                    key={index}
                    className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-sm text-center"
                  >
                    {className}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
            AI-Powered Object Detection
          </h2>
          <p className="text-lg text-gray-400 max-w-3xl mx-auto">
            Upload an image to instantly identify and locate objects from 80 different classes using Computer Vision.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left Panel */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gray-800/50 border border-gray-700/80 rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-4">Upload Image</h3>
              <div
                className={`relative group cursor-pointer transition-all duration-300 rounded-xl border-2 border-dashed ${dragOver ? 'border-blue-400 bg-blue-400/10' : 'border-gray-600 hover:border-gray-500'}`}
                onClick={handleUploadAreaClick}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                  aria-label="Upload image file"
                />
                <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                  <Upload className={`w-12 h-12 mb-3 transition-all duration-300 ${dragOver ? 'text-blue-400' : ''}`} />
                  <p className="font-semibold">{dragOver ? 'Drop image here' : 'Click or drag to upload'}</p>
                  <p className="text-xs text-gray-500">JPG, PNG, WEBP</p>
                </div>
              </div>
            </div>

            <button
              onClick={handlePredictClick}
              disabled={!image || loading}
              className="w-full py-3.5 px-6 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100 flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Zap className="w-6 h-6" />
                  <span>Detect Objects</span>
                </>
              )}
            </button>
          </div>

          {/* Right Panel (Image and Results) */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-gray-800/50 border border-gray-700/80 rounded-2xl p-4 flex items-center justify-center min-h-[20rem] sm:min-h-[25rem] md:min-h-[30rem]">
              {image ? (
                <div className="relative w-full h-full">
                  <img
                    ref={imageRef}
                    src={image}
                    alt="Preview"
                    className="w-full h-full object-contain rounded-lg"
                    loading="lazy"
                  />
                  {detections.map((detection, index) => (
                    <div
                      key={index}
                      className="absolute border-2 rounded-md transition-all duration-500 ease-out"
                      style={getBoundingBoxStyle(detection.bounding_box, index)}
                    >
                      <div className="absolute -top-7 left-0 px-2 py-0.5 rounded-md text-xs font-semibold text-white shadow-lg"
                        style={{ backgroundColor: getBoundingBoxStyle(detection.bounding_box, index).borderColor }}>
                        {detection.class_name}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <Target className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold">Image Preview</h3>
                  <p className="text-sm">Your uploaded image will appear here</p>
                </div>
              )}
            </div>

            {detections.length > 0 && (
              <div className="bg-gray-800/50 border border-gray-700/80 rounded-2xl p-6">
                <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
                  <h3 className="text-xl font-bold">Detection Results</h3>
                  <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full text-sm">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-green-400 font-medium">{detections.length} objects found</span>
                  </div>
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                  {detections.map((detection, index) => (
                    <div
                      key={index}
                      className={`p-3 bg-gray-700/40 hover:bg-gray-700/60 border border-gray-600/80 rounded-lg transition-all duration-300 ${animateDetections ? 'animate-slide-in-right' : 'opacity-0'}`}
                      style={{ animationDelay: `${index * 70}ms` }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getBoundingBoxStyle(detection.bounding_box, index).borderColor }}></div>
                          <span className="font-semibold">{detection.class_name}</span>
                        </div>
                        <span className={`font-mono text-sm ${getConfidenceColor(detection.confidence)}`}>
                          {(detection.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* About Section */}
        <div className="mt-20 bg-gray-800/30 backdrop-blur-lg border border-gray-700/50 rounded-2xl p-8 lg:p-12">
          <h3 className="text-3xl font-bold text-center mb-8 flex items-center justify-center gap-3">
            <Sparkles className="w-8 h-8 text-purple-400" />
            About This Project
          </h3>
          <div className="max-w-4xl mx-auto text-gray-300 space-y-6">
            <p className="text-lg text-center">
              <span className="font-bold text-purple-300">🔍 The Real Power of Computer Vision:</span> While this object detection model currently recognizes 80 common object categories, it's a glimpse into the broader capabilities of computer vision — not its limit.
            </p>
            <p className="text-center">
              Modern Computer Vision models can be trained and adapted for high-impact applications across industries, including:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
              <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">🛡️ <span className="font-bold">AI-Powered Surveillance:</span> Real-time detection of weapons, intruders, or suspicious activity.</div>
              <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">🎯 <span className="font-bold">Facial Recognition:</span> Identity verification for access control and authentication.</div>
              <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">🛍️ <span className="font-bold">Retail & Smart Stores:</span> Automated checkout and inventory monitoring.</div>
              <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">🏥 <span className="font-bold">Medical Imaging:</span> Tumor detection and diagnostic assistance in X-rays/MRIs.</div>
              <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">🛠️ <span className="font-bold">Manufacturing & QA:</span> Visual inspection for detecting defects on assembly lines.</div>
              <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">🌾 <span className="font-bold">Agriculture:</span> Plant disease detection and livestock monitoring.</div>
              <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">🚗 <span className="font-bold">Autonomous Vehicles:</span> Road sign and pedestrian detection.</div>
              <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">🎮 <span className="font-bold">Augmented Reality:</span> Real-world object tracking and gesture recognition.</div>
              <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">🌍 <span className="font-bold">Environmental Monitoring:</span> Wildlife tracking and illegal logging detection.</div>
            </div>
            <p className="text-center font-semibold text-purple-300 pt-4">
              This project is a lightweight demonstration — showing how accessible object detection can be, but it's also a gateway to more specialized, production-grade applications.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
