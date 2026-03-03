import React, { useEffect, useState } from 'react';
import ArtworkCard from './ArtworkCard';

export default function GalleryFeed({ refreshTrigger }) {
    const [artworks, setArtworks] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch artworks hook (Simulated or Real for alpha)
    useEffect(() => {
        const fetchArtworks = async () => {
            setLoading(true);
            try {
                const response = await fetch('http://localhost:5000/api/artworks');
                if (response.ok) {
                    const data = await response.json();
                    setArtworks(data);
                } else {
                    console.error('Failed to fetch artworks', response.statusText);
                }
            } catch (error) {
                console.error('API connection failed, using offline mock data', error);
            } finally {
                setLoading(false);
            }
        };

        fetchArtworks();
    }, [refreshTrigger]);

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="w-12 h-12 border-4 border-zinc-800 border-t-indigo-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (artworks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-32 text-zinc-500">
                <p className="text-xl font-medium mb-2">No artworks found</p>
                <p className="text-sm">Be the first to upload one!</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* CSS columns for Masonry layout */}
            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
                {artworks.map((artwork) => (
                    <ArtworkCard key={artwork._id} artwork={artwork} />
                ))}
            </div>
        </div>
    );
}
