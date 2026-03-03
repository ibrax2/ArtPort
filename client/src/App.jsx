import React, { useState } from 'react';
import Navbar from './components/Navbar';
import GalleryFeed from './components/GalleryFeed';
import UploadModal from './components/UploadModal';
import './App.css';

function App() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadSuccess = () => {
    // Trigger a re-fetch in the GalleryFeed
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">
      <Navbar onOpenUpload={() => setIsUploadModalOpen(true)} />

      <main className="pt-4 pb-20">
        <GalleryFeed refreshTrigger={refreshTrigger} />
      </main>

      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />
    </div>
  );
}

export default App;
