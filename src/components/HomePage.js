import { useEffect, useState } from "react";
import ChallengeCard from "./ChallengeCard";
import Feed from "./Feed";
import { onValue, ref } from "firebase/database";
import { db } from "../fb";


const HomePage =()=>{
   const [challenges, setChallenges] = useState([]);
   const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Buscar desafios do Firebase
    const challengesRef = ref(db, 'challenges');
    
    const unsubscribe = onValue(challengesRef, (snapshot) => {
      if (snapshot.exists()) {
        const challengesData = snapshot.val();
        // Converter o objeto em array e ordenar por data de criação (mais recentes primeiro)
        const challengesArray = Object.values(challengesData)
          .filter(challenge => challenge.status === 'ativo')
          .sort((a, b) => b.start_at - a.start_at);
        
        setChallenges(challengesArray);
      } else {
        setChallenges([]);
      }
      setLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, [])

   if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }


  return(<>
     {challenges.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {challenges.map((challenge, index) => (
              <ChallengeCard
                key={challenge.id || index}
                title={challenge.title}
                description={challenge.description}
                prize={`${challenge.prize} MT`}
                bannerUrl={challenge.banner_url}
                participants={challenge.participants_count || 0}
                endDate={challenge.end_at}
                entryFee={challenge.entry_fee}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-slate-800/50 rounded-2xl border border-white/5">
            <p className="text-gray-400">Nenhum desafio ativo no momento.</p>
            <p className="text-sm text-gray-500 mt-2">Seja o primeiro a criar um desafio!</p>
          </div>
        )}
    <Feed/>
    
    </>)

}
export default HomePage;