"use client";

type Post = {
  id: string;
  image: string;
  title: string;
  username: string;
  userImage: string;
};

export default function ArtIcon({ post }: { post: Post }) {
  return (
    <div className="articon-container">
      <img
        src={post.image}
        alt={post.title}
        className="articon-image"
      />

      <div className="articon-overlay">
        <div className="articon-user">
          <img
            src={post.userImage}
            alt=""
            className="articon-avatar"
          />
          <span className="articon-username">{post.username}</span>
        </div>

        <div className="articon-title">{post.title}</div>
      </div>
    </div>
  );
}
