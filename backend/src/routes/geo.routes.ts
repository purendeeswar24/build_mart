import { Router } from 'express';
import { AppError } from '../middleware/errorHandler.middleware';
import { reverseGeocodePrecise } from '../services/geo.service';

export const geoRouter = Router();

geoRouter.get('/reverse', async (req, res, next) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new AppError('BAD_COORDS', 'Latitude and longitude are required.', 400);
    }
    const place = await reverseGeocodePrecise(lat, lng);
    res.json(place);
  } catch (err) {
    next(err);
  }
});

geoRouter.get('/ip', async (_req, res) => {
  const fallback = {
    latitude: 17.4375,
    longitude: 78.4483,
    label: 'Hyderabad (test fallback)',
    city: 'Hyderabad',
    postcode: '500032',
    fallback: true,
  };
  try {
    const response = await fetch('http://ip-api.com/json/?fields=status,lat,lon,city,zip');
    const data = (await response.json()) as {
      status?: string;
      lat?: number;
      lon?: number;
      city?: string;
      zip?: string;
    };
    if (data.status !== 'success' || data.lat == null || data.lon == null) {
      res.json(fallback);
      return;
    }
    res.json({
      latitude: data.lat,
      longitude: data.lon,
      label: data.city ? `${data.city} (approx.)` : `${data.lat.toFixed(4)}, ${data.lon.toFixed(4)}`,
      city: data.city ?? null,
      postcode: data.zip?.replace(/\D/g, '').slice(0, 6) || null,
      fallback: false,
    });
  } catch {
    res.json(fallback);
  }
});
