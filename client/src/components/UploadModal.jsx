import React, { useState } from 'react';
import { X, UploadCloud, Loader2 } from 'lucide-react';

export default function UploadModal({ isOpen, onClose, onUploadSuccess }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            const objectUrl = URL.createObjectURL(selectedFile);
            setPreview(objectUrl);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title || !description || !file) {
            setError('Please fill all fields and select an image.');
            return;
        }

        setIsUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('image', file);
        // Hardcoded author ID for Alpha mockup (requires a real user ID in a real app)
        formData.append('author', '65f1a2b3c4d5e6f7a8b9c0d1');

        try {
            const response = await fetch('http://localhost:5000/api/artworks', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const newArtwork = await response.json();

            // Cleanup preview URL
            if (preview) {
                URL.revokeObjectURL(preview);
            }

            onUploadSuccess(newArtwork);
            onClose();
            // Reset form
            setTitle('');
            setDescription('');
            setFile(null);
            setPreview(null);
        } catch (err) {
            setError(err.message || 'Error connecting to the server.');
            console.error(err);
        } finally {
            setIsUploading(false);
        }
    };

    // Close modal when clicking outside
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm px-4"
            onClick={handleBackdropClick}
        >
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row relative">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 z-10 text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-700/50 rounded-full transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Left Side: Image Preview / Upload Area */}
                <div className="md:w-1/2 min-h-[300px] bg-zinc-950 relative border-b md:border-b-0 md:border-r border-zinc-800 flex flex-col items-center justify-center p-6 group">

                    {preview ? (
                        <div className="relative w-full h-full flex items-center justify-center">
                            <img src={preview} alt="Preview" className="max-w-full max-h-[400px] object-cover rounded-xl" />
                            <div className="absolute inset-0 bg-zinc-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl cursor-pointer">
                                <p className="text-white font-medium flex items-center gap-2">
                                    <UploadCloud className="w-5 h-5" /> Change Image
                                </p>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                            </div>
                        </div>
                    ) : (
                        <label className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-zinc-700 rounded-2xl cursor-pointer hover:border-indigo-500 hover:bg-zinc-900/50 transition-all duration-300">
                            <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4">
                                <UploadCloud className="w-8 h-8 text-indigo-500" />
                            </div>
                            <p className="text-zinc-300 font-medium text-lg mb-1">Click to upload image</p>
                            <p className="text-zinc-500 text-sm">PNG, JPG, WEBP up to 5MB</p>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </label>
                    )}
                </div>

                {/* Right Side: Form */}
                <div className="md:w-1/2 p-6 md:p-8 flex flex-col">
                    <h2 className="text-2xl font-bold text-white mb-6">New Request for Critique</h2>

                    <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-5">
                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-xl text-red-500 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="flex flex-col gap-2">
                            <label htmlFor="title" className="text-sm font-medium text-zinc-300">
                                Title of Request
                            </label>
                            <input
                                id="title"
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Help with lighting values"
                                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                maxLength={100}
                                required
                            />
                        </div>

                        <div className="flex flex-col gap-2 flex-1">
                            <label htmlFor="description" className="text-sm font-medium text-zinc-300">
                                What kind of feedback do you need?
                            </label>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe what specific areas you want critics to focus on (e.g. Anatomy, Color Theory, Composition)..."
                                className="w-full flex-1 min-h-[120px] px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                                maxLength={1000}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isUploading}
                            className="mt-auto w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                'Post for Critique'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
