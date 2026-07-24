import { useEffect, useState } from 'react'
import {
  Box, Typography, ToggleButton, ToggleButtonGroup, TextField,
  Button, CircularProgress, Paper, Table, TableHead, TableRow,
  TableCell, TableBody, Chip, Select, MenuItem, FormControl,
  InputLabel, IconButton, Tooltip,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import MapIcon from '@mui/icons-material/Map'
import { getLang, t, Lang } from '../i18n'
import {
  getCitiesByDate, getDatesByCity, listCities, listCountries,
  CityItem, CitiesByDateResponse, DatesByCityResponse,
} from '../services/api'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function monthAgo(): string {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return d.toISOString().slice(0, 10)
}

export default function CitiesPage() {
  const [lang] = useState<Lang>(getLang)
  const tr = t(lang)

  const [mode, setMode] = useState<'by-date' | 'by-city'>('by-date')

  // by-date state
  const [dateFrom, setDateFrom] = useState(monthAgo())
  const [dateTo, setDateTo] = useState(today())
  const [byDateResult, setByDateResult] = useState<CitiesByDateResponse | null>(null)

  // by-city state
  const [countries, setCountries] = useState<{ country_code: string; country: string }[]>([])
  const [selectedCountry, setSelectedCountry] = useState('')
  const [cities, setCities] = useState<CityItem[]>([])
  const [selectedCity, setSelectedCity] = useState('')
  const [byCityResult, setByCityResult] = useState<DatesByCityResponse | null>(null)

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    listCountries().then(r => setCountries(r.countries)).catch(console.error)
  }, [])

  useEffect(() => {
    if (mode === 'by-city') {
      listCities(selectedCountry || undefined).then(r => {
        setCities(r.cities)
        setSelectedCity('')
        setByCityResult(null)
      }).catch(console.error)
    }
  }, [mode, selectedCountry])

  function handleApplyByDate() {
    if (!dateFrom || !dateTo) return
    setLoading(true)
    getCitiesByDate(dateFrom, dateTo)
      .then(setByDateResult)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  function handleApplyByCity() {
    if (!selectedCity) return
    setLoading(true)
    getDatesByCity(selectedCity, selectedCountry || undefined)
      .then(setByCityResult)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  function openDay(date: string) {
    window.location.href = `/?date=${date}`
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{
        px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider',
        display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: 'background.paper', flexShrink: 0,
      }}>
        <Tooltip title={lang === 'ru' ? 'На карту' : 'Back to map'}>
          <IconButton size="small" href="/">
            <ArrowBackIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Typography variant="subtitle1" fontWeight={600}>
          {lang === 'ru' ? 'История городов' : 'Cities History'}
        </Typography>
      </Box>

      {/* Controls */}
      <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper', flexShrink: 0 }}>
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(_, v) => { if (v) { setMode(v); setByDateResult(null); setByCityResult(null) } }}
          size="small"
          sx={{ mb: 1.5 }}
        >
          <ToggleButton value="by-date" sx={{ textTransform: 'none', fontSize: 12 }}>
            {lang === 'ru' ? 'По периоду' : 'By period'}
          </ToggleButton>
          <ToggleButton value="by-city" sx={{ textTransform: 'none', fontSize: 12 }}>
            {lang === 'ru' ? 'По городу' : 'By city'}
          </ToggleButton>
        </ToggleButtonGroup>

        {mode === 'by-date' && (
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              type="date" label={lang === 'ru' ? 'С' : 'From'} value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              size="small" InputLabelProps={{ shrink: true }} sx={{ width: 160 }}
            />
            <TextField
              type="date" label={lang === 'ru' ? 'По' : 'To'} value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              size="small" InputLabelProps={{ shrink: true }} sx={{ width: 160 }}
            />
            <Button variant="contained" size="small" onClick={handleApplyByDate} disabled={loading}>
              {lang === 'ru' ? 'Применить' : 'Apply'}
            </Button>
          </Box>
        )}

        {mode === 'by-city' && (
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <FormControl size="small" sx={{ width: 160 }}>
              <InputLabel>{lang === 'ru' ? 'Страна' : 'Country'}</InputLabel>
              <Select
                value={selectedCountry}
                label={lang === 'ru' ? 'Страна' : 'Country'}
                onChange={e => setSelectedCountry(e.target.value)}
              >
                <MenuItem value=""><em>{lang === 'ru' ? 'Все' : 'All'}</em></MenuItem>
                {countries.map(c => (
                  <MenuItem key={c.country_code} value={c.country_code}>
                    {c.country_code} — {c.country}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ width: 200 }}>
              <InputLabel>{lang === 'ru' ? 'Город' : 'City'}</InputLabel>
              <Select
                value={selectedCity}
                label={lang === 'ru' ? 'Город' : 'City'}
                onChange={e => setSelectedCity(e.target.value)}
                disabled={cities.length === 0}
              >
                <MenuItem value=""><em>—</em></MenuItem>
                {cities.map(c => (
                  <MenuItem key={`${c.country_code}-${c.city}`} value={c.city}>{c.city}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained" size="small"
              onClick={handleApplyByCity}
              disabled={loading || !selectedCity}
            >
              {lang === 'ru' ? 'Применить' : 'Apply'}
            </Button>
          </Box>
        )}
      </Box>

      {/* Results */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {/* By-date result: table date → cities */}
        {!loading && mode === 'by-date' && byDateResult && (
          byDateResult.days.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {lang === 'ru' ? 'Нет данных за этот период' : 'No data for this period'}
            </Typography>
          ) : (
            <Paper variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, width: 130 }}>
                      {lang === 'ru' ? 'Дата' : 'Date'}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {lang === 'ru' ? 'Города' : 'Cities'}
                    </TableCell>
                    <TableCell sx={{ width: 48 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {byDateResult.days.map(day => (
                    <TableRow key={day.date} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                          {day.date}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {day.cities.map(c => (
                            <Chip
                              key={`${c.country_code}-${c.city}`}
                              label={`${c.city} (${c.country_code})`}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={lang === 'ru' ? 'Открыть на карте' : 'Open on map'}>
                          <IconButton size="small" onClick={() => openDay(day.date)}>
                            <MapIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )
        )}

        {/* By-city result: list of dates */}
        {!loading && mode === 'by-city' && byCityResult && (
          byCityResult.dates.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {lang === 'ru' ? 'Нет посещений' : 'No visits found'}
            </Typography>
          ) : (
            <Paper variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {lang === 'ru' ? 'Дата' : 'Date'}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {lang === 'ru' ? 'Страна' : 'Country'}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, width: 90 }}>
                      {lang === 'ru' ? 'Посещений' : 'Visits'}
                    </TableCell>
                    <TableCell sx={{ width: 48 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {byCityResult.dates.map(row => (
                    <TableRow key={row.date} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                          {row.date}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{row.country} ({row.country_code})</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{row.visit_count}</Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={lang === 'ru' ? 'Открыть на карте' : 'Open on map'}>
                          <IconButton size="small" onClick={() => openDay(row.date)}>
                            <MapIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )
        )}
      </Box>
    </Box>
  )
}
