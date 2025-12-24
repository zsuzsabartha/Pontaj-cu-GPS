import React, { useState } from 'react';
import { Office, Company, Coordinates } from '../types';
import { Building, MapPin, Trash2, Plus, Navigation } from 'lucide-react';
import { getCurrentLocation } from '../services/geoService';

interface OfficeManagementProps {
  offices: Office[];
  companies: Company[];
  onAdd: (office: Office) => void;
  onDelete: (id: string) => void;
}

const OfficeManagement: React.FC<OfficeManagementProps> = ({ offices, companies, onAdd, onDelete }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    companyId: companies[0]?.id || '',
    latitude: '',
    longitude: '',
    radiusMeters: '100'
  });
  const [locLoading, setLocLoading] = useState(false);

  const handleGetLocation = async () => {
    setLocLoading(true);
    try {
      const coords = await getCurrentLocation();
      setFormData(prev => ({
        ...prev,
        latitude: coords.latitude.toString(),
        longitude: coords.longitude.toString()
      }));
    } catch (e) {
      // Fallback for Test Environment
      if(confirm("Nu am putut prelua locația GPS. Doriți să completați cu o locație simulată (Test Mode)?")) {
         setFormData(prev => ({
            ...prev,
            latitude: "44.4268", // Mock lat
            longitude: "26.1025" // Mock long
          }));
      } else {
         alert("Vă rugăm să introduceți manual coordonatele sau să activați GPS-ul.");
      }
    } finally {
      setLocLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newOffice: Office = {
      id: `off-${Date.now()}`,
      name: formData.name,
      companyId: formData.companyId,
      coordinates: {
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude)
      },
      radiusMeters: parseInt(formData.radiusMeters)
    };
    onAdd(newOffice);
    setIsAdding(false);
    setFormData({ ...formData, name: '', latitude: '', longitude: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Building className="text-blue-600" />
          Management Sedii
        </h2>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center gap-2"
        >
          {isAdding ? 'Anulează' : <><Plus size={16}/> Adaugă Sediu</>}
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl shadow-md border border-blue-100 animate-in fade-in slide-in-from-top-4">
          <h3 className="font-semibold text-gray-700 mb-4">Detalii Sediu Nou</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Nume Sediu</label>
                <input 
                  required
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ex: Depozit Vest"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Companie</label>
                <select 
                  value={formData.companyId}
                  onChange={e => setFormData({...formData, companyId: e.target.value})}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Latitudine</label>
                <input 
                  required
                  type="number" 
                  step="any"
                  value={formData.latitude}
                  onChange={e => setFormData({...formData, latitude: e.target.value})}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Longitudine</label>
                <input 
                  required
                  type="number" 
                  step="any"
                  value={formData.longitude}
                  onChange={e => setFormData({...formData, longitude: e.target.value})}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <button 
                type="button"
                onClick={handleGetLocation}
                disabled={locLoading}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-lg transition flex items-center justify-center gap-2 h-[42px]"
              >
                <Navigation size={16} className={locLoading ? "animate-spin" : ""} />
                {locLoading ? '...' : 'Locația Mea'}
              </button>
            </div>

            <div>
               <label className="block text-sm font-medium text-gray-600 mb-1">Rază Permisă (metri)</label>
               <input 
                  required
                  type="number" 
                  value={formData.radiusMeters}
                  onChange={e => setFormData({...formData, radiusMeters: e.target.value})}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>

            <button type="submit" className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-200">
              Salvează Sediu
            </button>
          </form>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {offices.map(office => {
          const companyName = companies.find(c => c.id === office.companyId)?.name || 'N/A';
          return (
            <div key={office.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition relative group">
               <button 
                  onClick={() => onDelete(office.id)}
                  className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                  title="Șterge Sediu"
               >
                 <Trash2 size={18} />
               </button>

               <div className="flex items-start gap-3">
                 <div className="bg-blue-50 p-3 rounded-lg text-blue-600">
                    <MapPin size={24} />
                 </div>
                 <div>
                   <h3 className="font-bold text-gray-800">{office.name}</h3>
                   <p className="text-sm text-gray-500">{companyName}</p>
                   <div className="mt-2 text-xs text-gray-400 font-mono space-y-1">
                      <p>Lat: {office.coordinates.latitude.toFixed(4)}</p>
                      <p>Long: {office.coordinates.longitude.toFixed(4)}</p>
                      <p className="text-blue-400">Rază: {office.radiusMeters}m</p>
                   </div>
                 </div>
               </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OfficeManagement;