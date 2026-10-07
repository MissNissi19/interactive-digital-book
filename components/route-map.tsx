'use client'

import { useEffect, useRef } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import 'leaflet/dist/leaflet.css'

export type RouteMapNode = { ident: string; lat: number; lon: number }

export default function RouteMap({ nodes }: { nodes: RouteMapNode[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)

  useEffect(() => {
    if (!containerRef.current || nodes.length < 2) return
    let cancelled = false
    let map: LeafletMap | null = null

    void (async () => {
      const L = await import('leaflet')
      if (cancelled || !containerRef.current) return

      map = L.map(containerRef.current, { scrollWheelZoom: false })
      mapRef.current = map

      const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map)

      const openAip = L.tileLayer('/api/openaip/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openaip.net" target="_blank" rel="noreferrer">openAIP</a>',
        minZoom: 4,
        maxZoom: 19,
        maxNativeZoom: 14,
      }).addTo(map)

      L.control.layers({ OpenStreetMap: osm }, { 'OpenAIP (airspace, airports, navaids)': openAip }, { position: 'topright' }).addTo(map)

      const latLngs = nodes.map((node) => [node.lat, node.lon] as [number, number])

      L.polyline(latLngs, { color: '#c99534', weight: 3, opacity: 0.9, dashArray: '7 7' }).addTo(map)

      nodes.forEach((node, index) => {
        const endpoint = index === 0 || index === nodes.length - 1
        L.circleMarker([node.lat, node.lon], {
          radius: endpoint ? 7 : 4,
          color: endpoint ? '#98701e' : '#122438',
          fillColor: endpoint ? '#d6a94d' : '#f6efe2',
          fillOpacity: 1,
          weight: 2,
        })
          .addTo(map!)
          .bindTooltip(node.ident, {
            permanent: true,
            direction: 'top',
            offset: [0, -9],
            className: endpoint ? 'route-map-label route-map-label-endpoint' : 'route-map-label',
          })
      })

      map.fitBounds(L.latLngBounds(latLngs).pad(0.2))
    })()

    return () => {
      cancelled = true
      map?.remove()
      mapRef.current = null
    }
  }, [nodes])

  if (nodes.length < 2) return null

  return <div ref={containerRef} className="route-map h-[280px] w-full overflow-hidden rounded-xl" role="img" aria-label="Route map" />
}
