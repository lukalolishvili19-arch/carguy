import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/async_body.dart';

const _defaultLat = 41.7;
const _defaultLng = 44.8;

class MapScreen extends ConsumerStatefulWidget {
  const MapScreen({super.key});

  @override
  ConsumerState<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends ConsumerState<MapScreen> {
  List<Map<String, dynamic>> _places = [];
  bool _loading = true;
  Object? _error;
  final _mapController = MapController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _mapController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = ref.read(apiClientProvider);
      final items = await api.get(
        '/map/nearby',
        (j) {
          if (j is List) {
            return j
                .whereType<Map>()
                .map((e) => Map<String, dynamic>.from(e))
                .toList();
          }
          return parseItemMaps(j);
        },
        query: {'lat': _defaultLat, 'lng': _defaultLng},
      );
      if (mounted) setState(() => _places = items);
    } catch (e) {
      if (mounted) setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  LatLng _latLng(Map<String, dynamic> place) {
    final lat = (place['latitude'] as num?)?.toDouble() ?? _defaultLat;
    final lng = (place['longitude'] as num?)?.toDouble() ?? _defaultLng;
    return LatLng(lat, lng);
  }

  @override
  Widget build(BuildContext context) {
    final markers = _places
        .map(
          (p) => Marker(
            point: _latLng(p),
            width: 40,
            height: 40,
            child: const Icon(Icons.location_on, color: AppColors.brandRed, size: 36),
          ),
        )
        .toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Map'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loading ? null : _load),
        ],
      ),
      body: AsyncBody<List<Map<String, dynamic>>>(
        loading: _loading,
        error: _error,
        data: _places,
        onRetry: _load,
        builder: (context, places) {
          return Column(
            children: [
              SizedBox(
                height: 260,
                child: FlutterMap(
                  mapController: _mapController,
                  options: MapOptions(
                    initialCenter: const LatLng(_defaultLat, _defaultLng),
                    initialZoom: 11,
                  ),
                  children: [
                    TileLayer(
                      urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                      userAgentPackageName: 'com.carguy.mobile',
                    ),
                    MarkerLayer(markers: markers),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                child: Row(
                  children: [
                    const Icon(Icons.near_me, size: 18, color: AppColors.brandRed),
                    const SizedBox(width: 8),
                    Text(
                      '${places.length} places near Tbilisi',
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: places.isEmpty
                    ? const Center(
                        child: Text('No places found nearby', style: TextStyle(color: Colors.white54)),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: places.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (context, i) {
                          final place = places[i];
                          final name = place['name']?.toString() ?? 'Place';
                          final type = place['type']?.toString();
                          final distance = place['distanceKm'];
                          final address = place['address']?.toString() ?? place['city']?.toString();

                          return Card(
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: AppColors.brandRed.withValues(alpha: 0.15),
                                child: const Icon(Icons.place, color: AppColors.brandRed, size: 20),
                              ),
                              title: Text(name, style: const TextStyle(fontWeight: FontWeight.w600)),
                              subtitle: Text(
                                [
                                  if (type != null) type,
                                  if (distance != null) '${distance} km',
                                  if (address != null) address,
                                ].join(' · '),
                                style: const TextStyle(fontSize: 12),
                              ),
                              onTap: () {
                                final point = _latLng(place);
                                _mapController.move(point, 14);
                              },
                            ),
                          );
                        },
                      ),
              ),
            ],
          );
        },
      ),
    );
  }
}
