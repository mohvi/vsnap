import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { getDatabase, ref, get } from "firebase/database";

const ViewUser = () => {
  const { id } = useParams(); // Get the user ID from URL params
  const [userData, setUserData] = useState(null);
  const [referralCount, setReferralCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const db = getDatabase();
        
        // Fetch user data from the 'users' node
        const userRef = ref(db, `users/${id}`);
        const userSnapshot = await get(userRef);

        if (userSnapshot.exists()) {
          setUserData(userSnapshot.val());
        } else {
          setError("User not found");
        }

        // Fetch referrals from the 'referrals' node
        const referralsRef = ref(db, `referrals`);
        const referralsSnapshot = await get(referralsRef);

        if (referralsSnapshot.exists()) {
          const referralsData = referralsSnapshot.val();
          // Count referrals where the user is the referrer
          let count = 0;
          Object.keys(referralsData).forEach((referrer) => {
            if (referrer === userData?.username || referrer === id) {
              count += Object.keys(referralsData[referrer]).length;
            }
          });
          setReferralCount(count);
        }

        setLoading(false);
      } catch (err) {
        setError("Error fetching data: " + err.message);
        setLoading(false);
      }
    };

    fetchUserData();
  }, [id, userData?.username]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (!userData) {
    return <div>No user data available</div>;
  }

  return (
    <div>
      <h1>User Profile: {userData.username || "N/A"}</h1>
      <p><strong>UID:</strong> {id}</p>
      <p><strong>Email:</strong> {userData.email || "N/A"}</p>
      <p><strong>City:</strong> {userData.city || "N/A"}</p>
      <p><strong>Province:</strong> {userData.province || "N/A"}</p>
      <p><strong>Join Date:</strong> {userData.joinDate || "N/A"}</p>
      <p><strong>Last Login:</strong> {userData.lastLogin || "N/A"}</p>
      <p><strong>Level:</strong> {userData.level || "N/A"}</p>
      <p><strong>Points:</strong> {userData.points || 0}</p>
      <p><strong>Number of Referrals:</strong> {referralCount}</p>
    </div>
  );
};

export default ViewUser;