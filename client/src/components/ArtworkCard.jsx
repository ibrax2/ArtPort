import React from 'react';

export default function ArtworkCard({ artwork }) {
    // Extract mockup data
    const { title, description, imageUrl, author } = artwork;

    return (
        <div className="group relative rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all duration-300 break-inside-avoid mb-6 flex flex-col cursor-pointer shadow-lg hover:shadow-indigo-500/10 hover:-translate-y-1">
            {/* Image Container */}
            <div className="relative w-full overflow-hidden bg-zinc-950 aspect-auto">
                <img
                    src={imageUrl}
                    alt={title}
                    className="w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                {/* Critique Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Action button overlay */}
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-2 group-hover:translate-y-0">
                    <button className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-lg backdrop-blur-sm">
                        Give Critique
                    </button>
                </div>
            </div>

            {/* Info Section */}
            <div className="p-4 flex flex-col gap-2 relative z-10 bg-zinc-900">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-zinc-100 line-clamp-1 flex-1 leading-tight">
                        {title}
                    </h3>
                </div>

                {description && (
                    <p className="text-sm text-zinc-400 line-clamp-2 leading-relaxed">
                        {description}
                    </p>
                )}

                <div className="flex items-center gap-2 mt-2 pt-3 border-t border-zinc-800">
                    <div className="w-6 h-6 rounded-full bg-zinc-700 overflow-hidden flex-shrink-0">
                        {author?.profilePictureUrl ? (
                            <img src={author.profilePictureUrl} alt={author.username} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600" />
                        )}
                    </div>
                    <span className="text-xs font-medium text-zinc-300 truncate">
                        {author?.username || 'Anonymous Artist'}
                    </span>
                </div>
            </div>
        </div>
    );
}
