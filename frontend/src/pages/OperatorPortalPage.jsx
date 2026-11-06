import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Briefcase, Plus, Users, Bus, Calendar, DollarSign, Printer, ArrowRight, CheckCircle, Clock } from 'lucide-react';

export default function OperatorPortalPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('schedules'); // 'schedules', 'manifest', 'fleet', 'summary'

  // Data states
  const [trips, setTrips] = useState([]);
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [operators, setOperators] = useState([]);
  const [summary, setSummary] = useState(null);
  const [occupancyList, setOccupancyList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Manifest selection state
  const [selectedTripId, setSelectedTripId] = useState('');
  const [manifestData, setManifestData] = useState(null);
  const [manifestLoading, setManifestLoading] = useState(false);

  // Modals
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showBusModal, setShowBusModal] = useState(false);
  const [showRouteModal, setShowRouteModal] = useState(false);

  // New Schedule form
  const [schedRouteId, setSchedRouteId] = useState('');
  const [schedBusId, setSchedBusId] = useState('');
  const [schedDeparture, setSchedDeparture] = useState('');
  const [schedArrival, setSchedArrival] = useState('');
  const [schedFare, setSchedFare] = useState('40.00');

  // New Bus form
  const [busNumber, setBusNumber] = useState('');
  const [busType, setBusType] = useState('AC Seater 2+2');
  const [seatLayoutType, setSeatLayoutType] = useState('SEATER_2X2');
  const [busRows, setBusRows] = useState(7);
  const [amenities, setAmenities] = useState(['High-Speed WiFi', 'USB Charging Port', 'Water Bottle']);

  // New Route form
  const [sourceCity, setSourceCity] = useState('');
  const [destCity, setDestCity] = useState('');
  const [distanceKm, setDistanceKm] = useState('300');
  const [durationMins, setDurationMins] = useState('240');

  useEffect(() => {
    loadAllOperatorData();
  }, []);

  async function loadAllOperatorData() {
    setLoading(true);
    try {
      const [tripsRes, busesRes, routesRes, sumRes, occRes, opRes] = await Promise.all([
        api.getOperatorTrips(),
        api.getBuses(),
        api.getRoutes(),
        api.getBookingSummary(),
        api.getOccupancyReport(),
        api.getOperators()
      ]);

      if (tripsRes.success) {
        setTrips(tripsRes.trips);
        if (tripsRes.trips.length > 0 && !selectedTripId) {
          setSelectedTripId(tripsRes.trips[0].id);
          loadManifest(tripsRes.trips[0].id);
        }
      }
      if (busesRes.success) setBuses(busesRes.buses);
      if (routesRes.success) setRoutes(routesRes.routes);
      if (sumRes.success) setSummary(sumRes.summary);
      if (occRes.success) setOccupancyList(occRes.report);
      if (opRes.success) setOperators(opRes.operators);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadManifest(tripId) {
    if (!tripId) return;
    setManifestLoading(true);
    try {
      const res = await api.getPassengerManifest(tripId);
      if (res.success) {
        setManifestData(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setManifestLoading(false);
    }
  }

  async function handleCreateSchedule(e) {
    e.preventDefault();
    try {
      const res = await api.createTripSchedule({
        routeId: schedRouteId,
        busId: schedBusId,
        departureTime: schedDeparture,
        arrivalTime: schedArrival,
        baseFare: Number(schedFare),
        operatorId: user.operator_id || buses.find(b => b.id === Number(schedBusId))?.operator_id
      });
      if (res.success) {
        alert('Trip successfully scheduled! Generated ' + res.seatsGenerated + ' seats in inventory.');
        setShowScheduleModal(false);
        loadAllOperatorData();
      }
    } catch (err) {
      alert('Error scheduling trip: ' + err.message);
    }
  }

  async function handleCreateBus(e) {
    e.preventDefault();
    try {
      const res = await api.createBus({
        busNumber,
        busType,
        seatLayoutType,
        rows: Number(busRows),
        amenities,
        operatorId: user.operator_id || (operators[0]?.id || 1)
      });
      if (res.success) {
        alert(`Bus ${busNumber} created with ${res.totalSeats} seats generated!`);
        setShowBusModal(false);
        loadAllOperatorData();
      }
    } catch (err) {
      alert('Error adding bus: ' + err.message);
    }
  }

  async function handleCreateRoute(e) {
    e.preventDefault();
    try {
      const res = await api.createRoute({
        sourceCity,
        destinationCity: destCity,
        distanceKm: Number(distanceKm),
        estimatedDurationMins: Number(durationMins),
        operatorId: user.operator_id || (operators[0]?.id || 1)
      });
      if (res.success) {
        alert(`Route ${sourceCity} → ${destCity} created!`);
        setShowRouteModal(false);
        loadAllOperatorData();
      }
    } catch (err) {
      alert('Error creating route: ' + err.message);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Operator & Fleet Control Center</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {user?.operator_name ? `Operating: ${user.operator_name}` : 'Operator Dispatch & Reporting'} • Manage routes, schedules, passenger manifests and occupancy
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowScheduleModal(true)} className="btn btn-primary btn-sm">
            <Plus size={15} /> Schedule Trip
          </button>
          <button onClick={() => setShowBusModal(true)} className="btn btn-outline btn-sm">
            <Bus size={15} /> Add Bus
          </button>
          <button onClick={() => setShowRouteModal(true)} className="btn btn-outline btn-sm">
            <Plus size={15} /> Add Route
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="portal-tabs">
        <button
          className={`tab-btn ${activeTab === 'schedules' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedules')}
        >
          <Calendar size={15} style={{ display: 'inline', marginRight: 6 }} />
          Trip Schedules ({trips.length})
        </button>

        <button
          className={`tab-btn ${activeTab === 'manifest' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('manifest');
            if (selectedTripId) loadManifest(selectedTripId);
          }}
        >
          <Users size={15} style={{ display: 'inline', marginRight: 6 }} />
          Passenger Manifest
        </button>

        <button
          className={`tab-btn ${activeTab === 'fleet' ? 'active' : ''}`}
          onClick={() => setActiveTab('fleet')}
        >
          <Bus size={15} style={{ display: 'inline', marginRight: 6 }} />
          Fleet & Routes ({buses.length} Buses)
        </button>

        <button
          className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          <DollarSign size={15} style={{ display: 'inline', marginRight: 6 }} />
          Occupancy & Revenue Summary
        </button>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          Loading operator control data...
        </div>
      ) : (
        <>
          {/* TAB 1: SCHEDULES */}
          {activeTab === 'schedules' && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Scheduled Trips</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total: {trips.length} active schedules</span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Trip ID</th>
                      <th>Route</th>
                      <th>Bus Number & Type</th>
                      <th>Departure Date & Time</th>
                      <th>Base Fare</th>
                      <th>Occupancy</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trips.map(t => {
                      const occRate = t.total_seats > 0 ? Math.round((t.booked_seats / t.total_seats) * 100) : 0;
                      return (
                        <tr key={t.id}>
                          <td style={{ fontWeight: 700 }}>#{t.id}</td>
                          <td style={{ fontWeight: 600 }}>{t.source_city} → {t.destination_city}</td>
                          <td>
                            <div>{t.bus_number}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.bus_type}</div>
                          </td>
                          <td>
                            <div>{new Date(t.departure_time).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {new Date(t.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td style={{ fontWeight: 700 }}>${t.base_fare}</td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{t.booked_seats} / {t.total_seats} ({occRate}%)</div>
                            <div style={{ width: 100, height: 6, background: '#e2e8f0', borderRadius: 3, marginTop: 4 }}>
                              <div style={{ width: `${occRate}%`, height: '100%', background: occRate > 75 ? 'var(--success)' : 'var(--primary)', borderRadius: 3 }} />
                            </div>
                          </td>
                          <td>
                            <span className={`status-badge ${t.status}`}>{t.status}</span>
                          </td>
                          <td>
                            <button
                              onClick={() => {
                                setSelectedTripId(t.id);
                                setActiveTab('manifest');
                                loadManifest(t.id);
                              }}
                              className="btn btn-outline btn-sm"
                            >
                              <Users size={13} /> View Manifest
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: PASSENGER MANIFEST */}
          {activeTab === 'manifest' && (
            <div>
              {/* Trip Selector Dropdown & Print button */}
              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 280 }}>
                    <label style={{ fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap' }}>Select Trip Schedule:</label>
                    <select
                      className="form-select"
                      value={selectedTripId}
                      onChange={e => {
                        setSelectedTripId(e.target.value);
                        loadManifest(e.target.value);
                      }}
                    >
                      {trips.map(t => (
                        <option key={t.id} value={t.id}>
                          Trip #{t.id}: {t.source_city} → {t.destination_city} ({new Date(t.departure_time).toLocaleString()}) - Bus {t.bus_number}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button onClick={() => window.print()} className="btn btn-outline btn-sm">
                    <Printer size={15} /> Print / Export Manifest
                  </button>
                </div>
              </div>

              {manifestLoading ? (
                <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  Loading trip manifest...
                </div>
              ) : manifestData ? (
                <div>
                  {/* Reconciliation Metrics Card */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
                    <div className="card" style={{ padding: 16, marginBottom: 0 }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL CAPACITY</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{manifestData.manifest.totalSeats} seats</div>
                    </div>
                    <div className="card" style={{ padding: 16, marginBottom: 0 }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600 }}>CONFIRMED PASSENGERS</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--success)' }}>
                        {manifestData.manifest.confirmedPassengersCount}
                      </div>
                    </div>
                    <div className="card" style={{ padding: 16, marginBottom: 0 }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>AVAILABLE SEATS</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)' }}>
                        {manifestData.manifest.availableSeatsCount}
                      </div>
                    </div>
                    <div className="card" style={{ padding: 16, marginBottom: 0 }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>OCCUPANCY RATE</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>
                        {manifestData.manifest.occupancyRatePercentage}%
                      </div>
                    </div>
                    <div className="card" style={{ padding: 16, marginBottom: 0 }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>CONFIRMED REVENUE</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>
                        ${manifestData.manifest.totalTripRevenue}
                      </div>
                    </div>
                  </div>

                  {/* Active Passenger Manifest Table */}
                  <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                        Official Boarding Manifest (Confirmed Passengers)
                      </h3>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {manifestData.trip.source_city} → {manifestData.trip.destination_city} • Bus #{manifestData.trip.bus_number}
                      </span>
                    </div>

                    {manifestData.manifest.passengers.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                        No confirmed passengers booked on this trip yet. All {manifestData.manifest.totalSeats} seats are available.
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Seat</th>
                              <th>Passenger Name</th>
                              <th>Age / Gender</th>
                              <th>Boarding Stop</th>
                              <th>Drop Stop</th>
                              <th>Contact Phone</th>
                              <th>PNR Reference</th>
                              <th>Fare</th>
                            </tr>
                          </thead>
                          <tbody>
                            {manifestData.manifest.passengers.map(p => (
                              <tr key={p.passenger_id}>
                                <td style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1rem' }}>
                                  {p.seat_number}
                                </td>
                                <td style={{ fontWeight: 700 }}>{p.passenger_name}</td>
                                <td>{p.age} yrs • {p.gender}</td>
                                <td>{p.boarding_stop}</td>
                                <td>{p.drop_stop}</td>
                                <td>{p.contact_phone}</td>
                                <td>
                                  <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                                    {p.pnr}
                                  </code>
                                </td>
                                <td style={{ fontWeight: 600 }}>${p.fare}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Cancelled Booking History (Preserved History Requirement) */}
                  {manifestData.manifest.cancelledHistory?.length > 0 && (
                    <div className="card" style={{ borderLeft: '4px solid var(--danger)' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--danger)', marginBottom: 8 }}>
                        Preserved Cancellation History (Manifest Audit Record)
                      </h4>
                      <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Cancelled PNR</th>
                              <th>Contact Name</th>
                              <th>Passengers</th>
                              <th>Original Fare</th>
                              <th>Refund Disbursed</th>
                              <th>Cancelled At</th>
                            </tr>
                          </thead>
                          <tbody>
                            {manifestData.manifest.cancelledHistory.map((c, i) => (
                              <tr key={i}>
                                <td><code>{c.pnr}</code></td>
                                <td>{c.contact_name}</td>
                                <td>{c.total_passengers}</td>
                                <td>${c.total_amount}</td>
                                <td style={{ color: 'var(--success)', fontWeight: 600 }}>${c.refund_amount}</td>
                                <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                  {new Date(c.cancelled_at).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* TAB 3: FLEET & ROUTES */}
          {activeTab === 'fleet' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
              {/* Bus Fleet */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Fleet Vehicles ({buses.length})</h3>
                  <button onClick={() => setShowBusModal(true)} className="btn btn-outline btn-sm">
                    <Plus size={14} /> Add Bus
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {buses.map(b => (
                    <div key={b.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, background: '#f8fafc' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700 }}>{b.bus_number}</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>
                          {b.total_seats} Total Seats
                        </span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {b.bus_type} • Layout: {b.seat_layout_type}
                      </div>
                      <div style={{ marginTop: 6 }}>
                        {b.amenities?.map((a, i) => (
                          <span key={i} className="amenity-tag" style={{ fontSize: '0.7rem' }}>{a}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Routes */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Configured Routes ({routes.length})</h3>
                  <button onClick={() => setShowRouteModal(true)} className="btn btn-outline btn-sm">
                    <Plus size={14} /> Add Route
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {routes.map(r => (
                    <div key={r.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, background: '#f8fafc' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700 }}>{r.source_city} → {r.destination_city}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {r.distance_km} km ({Math.floor(r.estimated_duration_mins / 60)}h {r.estimated_duration_mins % 60}m)
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                        Stops: {r.stops?.map(s => s.stop_name).join(' → ') || 'Direct'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SUMMARY & OCCUPANCY */}
          {activeTab === 'summary' && summary && (
            <div>
              {/* Financial & Operational High-Level Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 20 }}>
                <div className="card" style={{ marginBottom: 0 }}>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>GROSS TICKET REVENUE</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginTop: 4 }}>
                    ${summary.grossRevenue}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: 2 }}>
                    From {summary.confirmedBookingsCount} confirmed bookings
                  </div>
                </div>

                <div className="card" style={{ marginBottom: 0 }}>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>SIMULATED REFUNDS ISSUED</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--danger)', marginTop: 4 }}>
                    -${summary.totalRefundsProcessed}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {summary.cancelledBookingsCount} cancellations processed
                  </div>
                </div>

                <div className="card" style={{ marginBottom: 0 }}>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>CANCELLATION FEES RETAINED</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--warning)', marginTop: 4 }}>
                    +${summary.totalCancellationFeesRetained}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    Policy retention fee
                  </div>
                </div>

                <div className="card" style={{ marginBottom: 0, background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                  <div style={{ fontSize: '0.82rem', color: '#166534', fontWeight: 700 }}>NET REVENUE</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#15803d', marginTop: 4 }}>
                    ${summary.netRevenue}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#166534', marginTop: 2 }}>
                    Gross + Retained Fees - Refunds
                  </div>
                </div>
              </div>

              {/* Occupancy Detail Table */}
              <div className="card">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 12 }}>
                  Trip-by-Trip Seat Occupancy Metrics
                </h3>

                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Trip</th>
                      <th>Route</th>
                      <th>Departure Date</th>
                      <th>Total Seats</th>
                      <th>Booked</th>
                      <th>Occupancy %</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {occupancyList.map(o => (
                      <tr key={o.trip_id}>
                        <td style={{ fontWeight: 700 }}>#{o.trip_id}</td>
                        <td style={{ fontWeight: 600 }}>{o.source_city} → {o.destination_city}</td>
                        <td>{new Date(o.departure_time).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(o.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        <td>{o.total_seats}</td>
                        <td style={{ fontWeight: 700 }}>{o.booked_seats}</td>
                        <td>
                          <span style={{ fontWeight: 700, color: o.occupancyRatePercentage > 50 ? 'var(--success)' : 'var(--text-main)' }}>
                            {o.occupancyRatePercentage}%
                          </span>
                        </td>
                        <td style={{ fontWeight: 700 }}>${o.confirmed_revenue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* SCHEDULE NEW TRIP MODAL */}
      {showScheduleModal && (
        <div className="seat-picker-modal">
          <div className="seat-picker-content" style={{ maxWidth: 500 }}>
            <div className="seat-picker-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Schedule New Bus Trip</h3>
              <button onClick={() => setShowScheduleModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateSchedule} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label dark">Select Route</label>
                <select required className="form-select" value={schedRouteId} onChange={e => setSchedRouteId(e.target.value)}>
                  <option value="">-- Choose Route --</option>
                  {routes.map(r => (
                    <option key={r.id} value={r.id}>{r.source_city} → {r.destination_city} ({r.distance_km} km)</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label dark">Select Bus from Fleet</label>
                <select required className="form-select" value={schedBusId} onChange={e => setSchedBusId(e.target.value)}>
                  <option value="">-- Choose Bus --</option>
                  {buses.map(b => (
                    <option key={b.id} value={b.id}>{b.bus_number} ({b.bus_type} - {b.total_seats} seats)</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="form-group">
                  <label className="form-label dark">Departure Time</label>
                  <input
                    type="datetime-local"
                    required
                    className="form-input"
                    value={schedDeparture}
                    onChange={e => setSchedDeparture(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label dark">Arrival Time</label>
                  <input
                    type="datetime-local"
                    required
                    className="form-input"
                    value={schedArrival}
                    onChange={e => setSchedArrival(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label dark">Base Ticket Fare ($)</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  className="form-input"
                  value={schedFare}
                  onChange={e => setSchedFare(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }}>
                Schedule Trip & Generate Seat Inventory
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ADD BUS MODAL */}
      {showBusModal && (
        <div className="seat-picker-modal">
          <div className="seat-picker-content" style={{ maxWidth: 480 }}>
            <div className="seat-picker-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Add Vehicle to Fleet</h3>
              <button onClick={() => setShowBusModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleCreateBus} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group">
                <label className="form-label dark">Bus Registration / Number</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. BUS-ROY-205"
                  value={busNumber}
                  onChange={e => setBusNumber(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label dark">Bus Model & Type</label>
                <select className="form-select" value={busType} onChange={e => setBusType(e.target.value)}>
                  <option value="AC Seater 2+2">AC Seater 2+2</option>
                  <option value="AC Sleeper 2+1">AC Sleeper 2+1</option>
                  <option value="Non-AC Seater 2+2">Non-AC Seater 2+2</option>
                  <option value="Multi-Axle Luxury Sleeper">Multi-Axle Luxury Sleeper</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="form-group">
                  <label className="form-label dark">Seat Layout Type</label>
                  <select className="form-select" value={seatLayoutType} onChange={e => setSeatLayoutType(e.target.value)}>
                    <option value="SEATER_2X2">2+2 Seater (4 seats/row)</option>
                    <option value="SLEEPER_2X1">2+1 Sleeper (3 berths/row)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label dark">Number of Rows</label>
                  <input
                    type="number"
                    min="3"
                    max="15"
                    className="form-input"
                    value={busRows}
                    onChange={e => setBusRows(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Layout will automatically construct {seatLayoutType === 'SLEEPER_2X1' ? busRows * 3 : busRows * 4} seats with coordinates.
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }}>
                Save Bus & Generate Layout
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ADD ROUTE MODAL */}
      {showRouteModal && (
        <div className="seat-picker-modal">
          <div className="seat-picker-content" style={{ maxWidth: 460 }}>
            <div className="seat-picker-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Add New Route</h3>
              <button onClick={() => setShowRouteModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleCreateRoute} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group">
                <label className="form-label dark">Source City</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. Philadelphia"
                  value={sourceCity}
                  onChange={e => setSourceCity(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label dark">Destination City</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. Washington DC"
                  value={destCity}
                  onChange={e => setDestCity(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="form-group">
                  <label className="form-label dark">Distance (km)</label>
                  <input
                    type="number"
                    required
                    className="form-input"
                    value={distanceKm}
                    onChange={e => setDistanceKm(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label dark">Duration (minutes)</label>
                  <input
                    type="number"
                    required
                    className="form-input"
                    value={durationMins}
                    onChange={e => setDurationMins(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }}>
                Save Route
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
