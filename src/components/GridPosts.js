import { useState, useEffect } from "react";
import { ref, update, push, onValue } from "firebase/database";
import { db } from "../fb";

const GridPosts = ({ posts, user, campaign }) => {
  const userId = user.uid;

  const [comments, setComments] = useState({});
  const [likes, setLikes] = useState({});
  const [activeComment, setActiveComment] = useState(null);

  useEffect(() => {
    const likesSubscriptions = [];

    Object.keys(posts).forEach((postId) => {
      const likesRef = ref(db, `challenges/${campaign}/posts/${postId}/likes`);
      const unsubscribe = onValue(likesRef, (snapshot) => {
        setLikes((prev) => ({ ...prev, [postId]: snapshot.val() || {} }));
      });
      likesSubscriptions.push(() => unsubscribe());
    });

    return () => {
      likesSubscriptions.forEach((unsubscribe) => unsubscribe());
    };
  }, [posts, campaign]);

  const handleLike = (postId) => {
    const postRef = ref(db, `challenges/${campaign}/posts/${postId}/likes`);
    const isLiked = likes[postId]?.[userId];

    update(postRef, {
      [userId]: isLiked ? null : true,
    }).catch((error) =>
      console.error("Erro ao interagir com o like:", error)
    );
  };

  const handleComment = (postId, commentText) => {
    if (!commentText) return;

    const commentRef = ref(db, `challenges/${campaign}/posts/${postId}/comments`);
    push(commentRef, {
      userId,
      text: commentText,
      createdAt: Date.now(),
    })
      .then(() => {
        setComments((prev) => ({ ...prev, [postId]: "" }));
        setActiveComment(null);
      })
      .catch((error) => console.error("Erro ao adicionar comentário:", error));
  };

  const handleShare = (postId) => {
    const postLink = `https://example.com/posts/${postId}`;
    if (navigator.share) {
      navigator
        .share({
          title: "Confira este post!",
          url: postLink,
        })
        .catch((error) => console.error("Erro ao compartilhar:", error));
    } else {
      navigator.clipboard
        .writeText(postLink)
        .then(() => alert("Link do post copiado para a área de transferência!"))
        .catch((error) => console.error("Erro ao copiar link:", error));
    }
  };

  return (
    <div className="scroll-container h-screen overflow-y-scroll bg-gray-50 p-4">
      {Object.entries(posts).map(([key, post]) => {
        const likeCount = likes[key]
          ? Object.values(likes[key]).filter(Boolean).length
          : 0;
        const isLiked = likes[key]?.[userId];

        return (
          <div
            key={key}
            className=" flex-col items-center mb-6 bg-white rounded-lg shadow-lg p-4"
          >
            <img
              src={post.photoUrl}
              alt={post.caption}
              className="object-cover w-full h-64 rounded-lg"
            />
            <div className="text-center mt-2">
              <p className="text-lg font-semibold text-gray-800">{post.caption}</p>
            </div>
            <div className="actions flex justify-around w-full mt-4">
              <button
                className={`flex items-center space-x-2 ${
                  isLiked ? "text-red-500" : "text-gray-500"
                }`}
                onClick={() => handleLike(key)}
              >
                <span>❤️</span>
                <span>{likeCount}</span>
              </button>
              <button
                className="flex items-center space-x-2 text-blue-500"
                onClick={() =>
                  setActiveComment((prev) => (prev === key ? null : key))
                }
              >
                <span>💬</span>
                <span>Comentários</span>
              </button>
              <button
                className="flex items-center space-x-2 text-green-500"
                onClick={() => handleShare(key)}
              >
                <span>🔗</span>
                <span>Compartilhar</span>
              </button>
            </div>

            {activeComment === key && (
              <div className="comments-container mt-4 p-4 w-full bg-gray-100 rounded-lg shadow-inner">
                <div className="comments-list max-h-40 overflow-y-auto">
                  {post.comments &&
                    Object.entries(post.comments).map(
                      ([commentKey, comment]) => (
                        <div
                          key={commentKey}
                          className="flex items-start mb-2 text-sm text-gray-700"
                        >
                          <strong className="mr-2">{comment.userId}:</strong>
                          <p>{comment.text}</p>
                        </div>
                      )
                    )}
                </div>
                <textarea
                  className="w-full mt-2 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Digite seu comentário..."
                  value={comments[key] || ""}
                  onChange={(e) =>
                    setComments((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                />
                <button
                  className="bg-blue-500 text-white py-2 px-4 rounded mt-2 hover:bg-blue-600"
                  onClick={() => handleComment(key, comments[key])}
                >
                  Enviar
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default GridPosts;
