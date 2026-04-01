import ArtworkPost from '@/components/ArtworkPost'

export default function PostPage() {
  return (
    <ArtworkPost
      imageUrl="/ArtPort/images/test-image.jpg"
      title="My Artwork"
      description="This is a test description"
      artistName="testuser"
    />
  )
}