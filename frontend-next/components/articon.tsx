"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";

type Post = {
  id: string;
  image: string;
  title: string;
  username: string;
  userImage: string;
};

export default function ArtIcon({ post }: { post: Post }) {
  return (
    <Link href={`/post/${encodeURIComponent(post.id)}`} className="articon-container">
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
          <span className="articon-username">by {post.username}</span>
        </div>

        <div className="articon-title">{post.title}</div>
      </div>
    </Link>
  );
}
