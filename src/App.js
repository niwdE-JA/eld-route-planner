import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Clock, Fuel, FileText, Navigation, Truck, Calendar, AlertCircle } from 'lucide-react';

const ELDRoutePlanner = () => {
  const [formData, setFormData] = useState({
    currentLocation: '',
    pickupLocation: '',
    dropoffLocation: '',
    currentCycleUsed: 0
  });
  
  const [routeData, setRouteData] = useState(null);
  const [logSheets, setLogSheets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  // Initialize map
  useEffect(() => {
    if (typeof window !== 'undefined' && window.google && mapRef.current && !mapInstanceRef.current) {
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: 39.8283, lng: -98.5795 }, // Center of US
        zoom: 4,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'currentCycleUsed' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      // Call your existing REST API
      const response = await fetch(`${process.env.API_BASE_URL}/api/calculate-route`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to calculate route');
      }

      const data = await response.json();
      setRouteData(data.route);
      setLogSheets(data.logSheets);
      
      // Update map with route
      if (mapInstanceRef.current && data.route) {
        updateMap(data.route);
      }
      
    } catch (err) {
      setError(err.message || 'An error occurred while calculating the route');
      // For demo purposes, show mock data
      generateMockData();
    } finally {
      setLoading(false);
    }
  };

  const generateMockData = () => {
    // Mock route data for demonstration
    const mockRoute = {
      totalDistance: 1250,
      totalTime: 18.5,
      waypoints: [
        { name: formData.currentLocation || 'Current Location', lat: 40.7128, lng: -74.0060, type: 'start' },
        { name: 'Fuel Stop - TA Travel Center', lat: 41.4993, lng: -81.6944, type: 'fuel', estimatedArrival: '2024-06-15T10:30:00' },
        { name: formData.pickupLocation || 'Pickup Location', lat: 41.8781, lng: -87.6298, type: 'pickup', estimatedArrival: '2024-06-15T14:00:00' },
        { name: 'Mandatory Rest Area', lat: 41.2524, lng: -95.9980, type: 'rest', estimatedArrival: '2024-06-15T22:00:00' },
        { name: 'Fuel Stop - Pilot Flying J', lat: 39.7391, lng: -104.9847, type: 'fuel', estimatedArrival: '2024-06-16T08:00:00' },
        { name: formData.dropoffLocation || 'Dropoff Location', lat: 37.7749, lng: -122.4194, type: 'dropoff', estimatedArrival: '2024-06-16T16:30:00' }
      ],
      fuelStops: 2,
      restPeriods: [
        { start: '2024-06-15T22:00:00', end: '2024-06-16T08:00:00', duration: 10, type: '34-hour reset' }
      ]
    };
    
    const mockLogSheets = [
      {
        date: '2024-06-15',
        drivingTime: 8,
        onDutyTime: 10,
        restTime: 14,
        violations: [],
        entries: [
          { time: '06:00', status: 'off-duty', location: 'Current Location' },
          { time: '08:00', status: 'on-duty', location: 'Pre-trip inspection' },
          { time: '09:00', status: 'driving', location: 'En route to pickup' },
          { time: '14:00', status: 'on-duty', location: 'Pickup - Loading' },
          { time: '15:00', status: 'driving', location: 'En route to delivery' },
          { time: '22:00', status: 'off-duty', location: 'Rest area - Mandatory rest' }
        ]
      },
      {
        date: '2024-06-16',
        drivingTime: 6.5,
        onDutyTime: 8.5,
        restTime: 15.5,
        violations: [],
        entries: [
          { time: '08:00', status: 'off-duty', location: 'Rest area' },
          { time: '08:30', status: 'on-duty', location: 'Pre-trip inspection' },
          { time: '09:00', status: 'driving', location: 'En route to delivery' },
          { time: '15:30', status: 'on-duty', location: 'Delivery - Unloading' },
          { time: '16:30', status: 'off-duty', location: 'Delivery complete' }
        ]
      }
    ];
    
    setRouteData(mockRoute);
    setLogSheets(mockLogSheets);
    updateMap(mockRoute);
  };

  const updateMap = (route) => {
    if (!mapInstanceRef.current || !route.waypoints) return;

    // Clear existing markers and paths
    // (In a real implementation, you'd store and clear previous markers)
    
    const bounds = new window.google.maps.LatLngBounds();
    const waypoints = route.waypoints;
    
    // Add markers for each waypoint
    waypoints.forEach((waypoint, index) => {
      const position = { lat: waypoint.lat, lng: waypoint.lng };
      
      let icon = {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: getMarkerColor(waypoint.type),
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2
      };
      
      if (waypoint.type === 'start' || waypoint.type === 'dropoff') {
        icon = {
          path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: waypoint.type === 'start' ? '#10b981' : '#ef4444',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2
        };
      }
      
      new window.google.maps.Marker({
        position,
        map: mapInstanceRef.current,
        title: waypoint.name,
        icon
      });
      
      bounds.extend(position);
    });
    
    // Draw route path
    const routePath = new window.google.maps.Polyline({
      path: waypoints.map(wp => ({ lat: wp.lat, lng: wp.lng })),
      geodesic: true,
      strokeColor: '#3b82f6',
      strokeOpacity: 0.8,
      strokeWeight: 4
    });
    
    routePath.setMap(mapInstanceRef.current);
    mapInstanceRef.current.fitBounds(bounds);
  };

  const getMarkerColor = (type) => {
    switch (type) {
      case 'start': return '#10b981';
      case 'pickup': return '#f59e0b';
      case 'dropoff': return '#ef4444';
      case 'fuel': return '#8b5cf6';
      case 'rest': return '#06b6d4';
      default: return '#6b7280';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'driving': return 'bg-green-500';
      case 'on-duty': return 'bg-yellow-500';
      case 'off-duty': return 'bg-gray-500';
      default: return 'bg-blue-500';
    }
  };

  const formatTime = (hours) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const LogSheet = ({ log, index }) => (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Calendar className="w-6 h-6 text-blue-600" />
          <h3 className="text-xl font-bold text-gray-900">Daily Log - {log.date}</h3>
        </div>
        <div className="text-sm text-gray-600">
          Sheet {index + 1}
        </div>
      </div>
      
      {/* HOS Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
          <div className="text-sm font-medium text-green-700">Driving Time</div>
          <div className="text-2xl font-bold text-green-900">{formatTime(log.drivingTime)}</div>
          <div className="text-xs text-green-600">11hr limit</div>
        </div>
        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200">
          <div className="text-sm font-medium text-yellow-700">On-Duty Time</div>
          <div className="text-2xl font-bold text-yellow-900">{formatTime(log.onDutyTime)}</div>
          <div className="text-xs text-yellow-600">14hr limit</div>
        </div>
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
          <div className="text-sm font-medium text-blue-700">Rest Time</div>
          <div className="text-2xl font-bold text-blue-900">{formatTime(log.restTime)}</div>
          <div className="text-xs text-blue-600">10hr minimum</div>
        </div>
      </div>
      
      {/* Timeline */}
      <div className="space-y-3">
        <h4 className="font-semibold text-gray-900 mb-3">Daily Timeline</h4>
        {log.entries.map((entry, idx) => (
          <div key={idx} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(entry.status)}`}></div>
              <span className="font-mono text-sm font-medium">{entry.time}</span>
            </div>
            <div className="flex-1">
              <span className="capitalize font-medium text-gray-900">{entry.status.replace('-', ' ')}</span>
              <span className="text-gray-600 ml-2">- {entry.location}</span>
            </div>
          </div>
        ))}
      </div>
      
      {log.violations && log.violations.length > 0 && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2 text-red-700 font-medium mb-2">
            <AlertCircle className="w-4 h-4" />
            <span>HOS Violations</span>
          </div>
          {log.violations.map((violation, idx) => (
            <div key={idx} className="text-sm text-red-600">{violation}</div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center items-center space-x-3 mb-4">
            <Truck className="w-12 h-12 text-blue-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              ELD Route Planner
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Professional trucking route optimization with automated HOS compliance and ELD log generation
          </p>
        </div>

        {/* Input Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Navigation className="w-6 h-6 mr-3 text-blue-600" />
            Trip Details
          </h2>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Current Location
                </label>
                <input
                  type="text"
                  name="currentLocation"
                  value={formData.currentLocation}
                  onChange={handleInputChange}
                  placeholder="e.g., New York, NY"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Pickup Location
                </label>
                <input
                  type="text"
                  name="pickupLocation"
                  value={formData.pickupLocation}
                  onChange={handleInputChange}
                  placeholder="e.g., Chicago, IL"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Dropoff Location
                </label>
                <input
                  type="text"
                  name="dropoffLocation"
                  value={formData.dropoffLocation}
                  onChange={handleInputChange}
                  placeholder="e.g., Los Angeles, CA"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Current Cycle Used (Hours)
                </label>
                <input
                  type="number"
                  name="currentCycleUsed"
                  value={formData.currentCycleUsed}
                  onChange={handleInputChange}
                  min="0"
                  max="70"
                  step="0.5"
                  placeholder="0"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>
            
            <div
              onClick={handleSubmit}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl cursor-pointer text-center"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Calculating Route...
                </div>
              ) : (
                'Calculate Route & Generate Logs'
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
            <p className="text-sm text-red-600 mt-1">Showing demo data for preview purposes.</p>
          </div>
        )}

        {/* Route Information */}
        {routeData && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <Navigation className="w-6 h-6 mr-3 text-blue-600" />
              Route Overview
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700">Total Distance</p>
                    <p className="text-3xl font-bold text-blue-900">{routeData.totalDistance}</p>
                    <p className="text-xs text-blue-600">miles</p>
                  </div>
                  <Navigation className="w-8 h-8 text-blue-600" />
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700">Estimated Time</p>
                    <p className="text-3xl font-bold text-green-900">{formatTime(routeData.totalTime)}</p>
                    <p className="text-xs text-green-600">driving time</p>
                  </div>
                  <Clock className="w-8 h-8 text-green-600" />
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-700">Fuel Stops</p>
                    <p className="text-3xl font-bold text-purple-900">{routeData.fuelStops}</p>
                    <p className="text-xs text-purple-600">planned stops</p>
                  </div>
                  <Fuel className="w-8 h-8 text-purple-600" />
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-700">Log Sheets</p>
                    <p className="text-3xl font-bold text-orange-900">{logSheets.length}</p>
                    <p className="text-xs text-orange-600">daily logs</p>
                  </div>
                  <FileText className="w-8 h-8 text-orange-600" />
                </div>
              </div>
            </div>
            
            {/* Map */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Route Map & Stops</h3>
              <div className="relative">
                <div 
                  ref={mapRef} 
                  className="w-full h-96 rounded-xl border border-gray-300 bg-gray-100"
                  style={{ minHeight: '400px' }}
                >
                  {/* Fallback content when Google Maps isn't loaded */}
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">Interactive map will display here</p>
                      <p className="text-sm text-gray-400">Google Maps integration required</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Waypoints List */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Planned Stops</h3>
              <div className="space-y-3">
                {routeData.waypoints.map((waypoint, index) => (
                  <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className={`w-4 h-4 rounded-full`} style={{ backgroundColor: getMarkerColor(waypoint.type) }}></div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{waypoint.name}</div>
                      <div className="text-sm text-gray-600 capitalize">{waypoint.type.replace('-', ' ')}</div>
                    </div>
                    {waypoint.estimatedArrival && (
                      <div className="text-sm text-gray-500">
                        ETA: {new Date(waypoint.estimatedArrival).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ELD Log Sheets */}
        {logSheets.length > 0 && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-4 flex items-center justify-center">
                <FileText className="w-8 h-8 mr-3 text-blue-600" />
                Generated ELD Log Sheets
              </h2>
              <p className="text-gray-600">DOT-compliant daily logs with HOS tracking</p>
            </div>
            
            {logSheets.map((log, index) => (
              <LogSheet key={index} log={log} index={index} />
            ))}
            
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-6 h-6 text-blue-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">HOS Compliance Information</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Property-carrying driver: 70-hour/8-day cycle</li>
                    <li>• Maximum 11 hours driving after 10 consecutive hours off-duty</li>
                    <li>• Maximum 14 hours on-duty (including driving)</li>
                    <li>• Fuel stops planned every 1,000 miles maximum</li>
                    <li>• 1 hour allocated for pickup and drop-off activities</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Google Maps Script - Add to your HTML head */}
      <script 
        src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=geometry" 
        async 
        defer
      ></script>
    </div>
  );
};

export default ELDRoutePlanner;