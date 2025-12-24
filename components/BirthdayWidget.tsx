
import React from 'react';
import { User } from '../types';
import { Cake, Sparkles } from 'lucide-react';

interface BirthdayWidgetProps {
  users: User[];
  currentUser: User;
}

const BirthdayWidget: React.FC<BirthdayWidgetProps> = ({ users, currentUser }) => {
  const today = new Date();
  const currentMonth = today.getMonth() + 1; // 1-12
  const currentDay = today.getDate();

  const birthdayColleagues = users.filter(u => {
      if (!u.birthDate || !u.shareBirthday || u.id === currentUser.id) return false;
      const d = new Date(u.birthDate);
      // Note: In real app handle timezones carefully, here we assume ISO YYYY-MM-DD
      // Check if month and day match
      return (d.getMonth() + 1) === currentMonth && (d.getDate()) === currentDay;
  });

  if (birthdayColleagues.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white p-4 rounded-xl shadow-lg mb-4 animate-in slide-in-from-top-4">
       <div className="flex items-center gap-2 font-bold mb-2">
           <Cake size={20} className="animate-bounce" />
           <h3>Aniversări Astăzi!</h3>
       </div>
       <div className="space-y-2">
           {birthdayColleagues.map(u => (
               <div key={u.id} className="flex items-center gap-2 bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                   <img src={u.avatarUrl} alt={u.name} className="w-8 h-8 rounded-full border-2 border-white" />
                   <div className="text-sm">
                       <p className="font-semibold">{u.name}</p>
                       <p className="text-xs opacity-90 text-white/80">La mulți ani! <Sparkles size={10} className="inline"/></p>
                   </div>
               </div>
           ))}
       </div>
    </div>
  );
};

export default BirthdayWidget;
