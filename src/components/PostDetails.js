import React, { useEffect, useState } from "react";
import {
  getDatabase,
  ref,
  onValue,
  push,
  set,
  serverTimestamp,
  update,
  get,
} from "firebase/database";
import { useParams } from "react-router-dom";
import { FaThumbsUp, FaComment, FaShareAlt, FaFlag } from "react-icons/fa";

const PostDetails = ({ user }) => {
  const { campaignId, postId } = useParams(); 
  const [post, setPost] = useState(null);
  const [newComment, setNewComment] = useState("");
  const db = getDatabase();

  const currentUserId = user.uid;
  const userName = user.displayName;

  useEffect(() => {
    const postRef = ref(db, `campaigns/${campaignId}/posts/${postId}`);
    onValue(postRef, (snapshot) => {
      if (snapshot.exists()) {
        setPost(snapshot.val());
      }
    });
  }, [db, campaignId, postId]);

  const handleLike = async () => {
    if (!currentUserId) return;
    const likeRef = ref(db, `campaigns/${campaignId}/posts/${postId}/likes/${currentUserId}`);
    const snapshot = await get(likeRef);

    if (snapshot.exists()) {
      set(likeRef, null);
    } else {
      set(likeRef, true);
    }
  };

  const handleComment = () => {
    if (newComment.trim() === "" || !currentUserId) return;
    const commentsRef = ref(db, `campaigns/${campaignId}/posts/${postId}/comments`);
    const newCommentRef = push(commentsRef);
    set(newCommentRef, {
      userId: currentUserId,
      name: userName,
      comment: newComment,
      createdAt: serverTimestamp(),
    });
    setNewComment("");
  };

  const handleShare = () => {
    const url = window.location.href;
    const text = `Confira esta publicação de ${post.userName}: ${post.caption} - ${url}`;
    if (navigator.share) {
      navigator.share({
        title: "Partilhar Publicação",
        text,
        url,
      });
    } else {
      navigator.clipboard.writeText(text);
      alert("Link copiado para a área de transferência!");
    }
  };

  const handleReport = () => {
    const reportRef = ref(db, `reports/${campaignId}/posts/${postId}/${currentUserId}`);
    set(reportRef, {
      reason: "Conteúdo inadequado",
      reportedAt: serverTimestamp(),
    });
    alert("Postagem reportada. A nossa equipa irá analisar.");
  };

  if (!post) {
    return <div>Carregando detalhes do post...</div>;
  }

  return (
    <div className="max-w-lg mx-auto p-4 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-2">{post.userName}</h2>
      <p className="text-gray-600 mb-4">{post.caption}</p>
      {post.photoUrl && (
        <img src={post.photoUrl} alt="Post" className="w-full h-auto mb-4 rounded" />
      )}

      <div className="flex items-center space-x-4 mb-4">
        <button onClick={handleLike} className="flex items-center space-x-1 text-blue-500">
          <FaThumbsUp />
          <span>
            {post.likes ? Object.keys(post.likes).length : 0} Likes
          </span>
        </button>
        <button className="flex items-center space-x-1 text-gray-500">
          <FaComment />
          <span>
            {post.comments ? Object.keys(post.comments).length : 0} Comentários
          </span>
        </button>
        <button onClick={handleShare} className="flex items-center space-x-1 text-green-500">
          <FaShareAlt />
          <span>Partilhar</span>
        </button>
        <button onClick={handleReport} className="flex items-center space-x-1 text-red-500">
          <FaFlag />
          <span>Reportar</span>
        </button>
      </div>

      <div className="mb-4">
        <h3 className="text-lg font-semibold">Comentários:</h3>
        {post.comments ? (
          Object.entries(post.comments).map(([commentId, comment]) => (
            <div key={commentId} className="bg-gray-100 p-2 rounded mt-2">
              <p className="text-sm font-semibold">{comment.name}</p>
              <p className="text-gray-700">{comment.comment}</p>
            </div>
          ))
        ) : (
          <p className="text-gray-500">Sem comentários ainda.</p>
        )}
      </div>

      <div className="mt-4">
        <textarea
          className="w-full p-2 border rounded mb-2"
          placeholder="Escreva um comentário..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
        />
        <button
          onClick={handleComment}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Comentar
        </button>
      </div>
    </div>
  );
};

export default PostDetails;
