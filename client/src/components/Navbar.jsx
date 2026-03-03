import React from 'react';
import { Search, UserCircle, Upload } from 'lucide-react';

export default function Navbar({ onOpenUpload }) {
    return (
        <nav className="sticky top-0 z-50 w-full backdrop-blur-md bg-zinc-950/80 border-b border-zinc-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">

                    {/* Logo & Brand */}
                    <div className="flex-shrink-0 flex items-center gap-2 cursor-pointer">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center">
                            <span className="text-white font-bold text-xl">A</span>
                        </div>
                        <span className="text-white font-bold text-xl tracking-tight hidden sm:block">ArtPort</span>
                    </div>

                    {/* Search Bar - Center */}
                    <div className="flex-1 max-w-lg px-4 hidden md:block">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-zinc-400" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-10 pr-3 py-2 border border-zinc-700 rounded-full leading-5 bg-zinc-900/50 text-zinc-300 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all duration-300"
                                placeholder="Search artworks, artists, styles..."
                            />
                        </div>
                    </div>

                    {/* Right side actions */}
                    <div className="flex-shrink-0 flex items-center gap-4">
                        <button
                            onClick={onOpenUpload}
                            className="group flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-white/10 hover:bg-white/20 rounded-full transition-all duration-300"
                        >
                            <Upload className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                            <span className="hidden sm:inline">Upload</span>
                        </button>
                        <button className="text-zinc-400 hover:text-white transition-colors duration-200">
                            <UserCircle className="h-8 w-8" />
                        </button>
                    </div>
                </div>

                {/* Categories/Tabs navigation line */}
                <div className="flex space-x-8 overflow-x-auto pb-2 scrollbar-hide text-sm font-medium border-t border-zinc-800/50 pt-2 h-10">
                    <button className="text-white border-b-2 border-indigo-500 pb-1 px-1 whitespace-nowrap">Explore</button>
                    <button className="text-zinc-400 hover:text-zinc-200 transition-colors pb-1 px-1 whitespace-nowrap">Top</button>
                    <button className="text-zinc-400 hover:text-zinc-200 transition-colors pb-1 px-1 whitespace-nowrap">New</button>
                    <button className="text-zinc-400 hover:text-zinc-200 transition-colors pb-1 px-1 whitespace-nowrap">Trending</button>
                </div>
            </div>
        </nav>
    );
}
