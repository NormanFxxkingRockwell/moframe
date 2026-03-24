import { Canvas } from '@react-three/fiber'
import { Html, OrbitControls, useGLTF } from '@react-three/drei'
import { Suspense, useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import './App.css'

const MODEL_PATH = '/models/ducati/ducati_panigale_v4.glb'
const ATTRIBUTION_TEXT = 'Ducati Panigale V4 by ROY on Sketchfab (CC BY 4.0)'

const bikeCatalog = [
  {
    id: 'ducati-panigale-v4',
    name: 'Ducati Panigale V4',
    year: 'Local GLB',
    note: '已切换到本地模型加载',
  },
  {
    id: 'r1',
    name: 'Yamaha R1',
    year: 'Queued',
    note: '下一台优先扩展',
  },
  {
    id: 'ninja-400',
    name: 'Kawasaki Ninja 400',
    year: 'Queued',
    note: '等待车模资源',
  },
  {
    id: 'cbr650r',
    name: 'Honda CBR650R',
    year: 'Queued',
    note: '等待车模资源',
  },
]

const editableGroups = [
  {
    key: 'fairing',
    label: '车壳主色',
    description: '负责大部分外壳喷涂区域',
    matchers: ['body_red_paint', 'body_black_paint'],
    defaultColor: '#a5121f',
  },
  {
    key: 'tank',
    label: '油箱区域',
    description: '控制油箱附近独立喷涂块',
    matchers: ['body_red_paint.001', 'body_red_paint.002'],
    defaultColor: '#b71625',
  },
  {
    key: 'rims',
    label: '轮毂',
    description: '控制轮圈和金属轮毂件',
    matchers: ['polish_matle', 'polish_matle.001'],
    defaultColor: '#c9ced8',
  },
  {
    key: 'seat',
    label: '座椅',
    description: '控制座椅和软质深色区域',
    matchers: ['heavy_mattle'],
    defaultColor: '#202020',
  },
  {
    key: 'frame',
    label: '车架',
    description: '控制车架和结构黑色部件',
    matchers: ['Material_black_plastic', 'hard_plastic_black'],
    defaultColor: '#2c3139',
  },
]

function normalizeMaterialEntry(material) {
  if (!material?.color) {
    return null
  }

  return {
    id: material.uuid,
    name: material.name || `Material ${material.uuid.slice(0, 8)}`,
    color: `#${material.color.getHexString()}`,
  }
}

function getMaterialGroup(materialName) {
  const normalizedName = materialName.toLowerCase()

  return (
    editableGroups.find((group) =>
      group.matchers.some((matcher) => normalizedName.includes(matcher.toLowerCase())),
    ) ?? null
  )
}

function buildInitialGroupColorMap(materials) {
  return Object.fromEntries(
    editableGroups.map((group) => {
      const matchedMaterial = materials.find((material) => getMaterialGroup(material.name)?.key === group.key)
      return [group.key, matchedMaterial?.color ?? group.defaultColor]
    }),
  )
}

function LoadingFallback() {
  return (
    <Html center>
      <div className="viewer-loading">正在加载本地 Ducati 模型...</div>
    </Html>
  )
}

function DucatiModel({ groupColorMap, onMaterialsReady }) {
  const gltf = useGLTF(MODEL_PATH)

  const processed = useMemo(() => {
    const cloned = gltf.scene.clone(true)
    const materialMap = new Map()

    cloned.traverse((object) => {
      if (!object.isMesh) {
        return
      }

      object.castShadow = false
      object.receiveShadow = false
      object.frustumCulled = true

      if (Array.isArray(object.material)) {
        object.material = object.material.map((material) => {
          const clone = material.clone()
          materialMap.set(clone.uuid, clone)
          return clone
        })
        return
      }

      if (object.material) {
        const clone = object.material.clone()
        materialMap.set(clone.uuid, clone)
        object.material = clone
      }
    })

    const box = new THREE.Box3().setFromObject(cloned)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const maxDimension = Math.max(size.x, size.y, size.z) || 1
    const scale = 2.1 / maxDimension

    cloned.position.sub(center)
    cloned.position.y -= box.min.y - center.y

    return {
      root: cloned,
      scale,
      materials: [...materialMap.values()],
    }
  }, [gltf.scene])

  useEffect(() => {
    onMaterialsReady(processed.materials.map(normalizeMaterialEntry).filter(Boolean))
  }, [onMaterialsReady, processed.materials])

  useEffect(() => {
    processed.materials.forEach((material) => {
      const group = getMaterialGroup(material.name)
      if (!group) {
        return
      }

      const nextColor = groupColorMap[group.key]
      if (nextColor && material.color) {
        material.color.set(nextColor)
      }
    })
  }, [groupColorMap, processed.materials])

  return (
    <group scale={processed.scale} rotation={[0, Math.PI * 0.08, 0]} position={[0, -0.7, 0]}>
      <primitive object={processed.root} />
    </group>
  )
}

function GroupColorField({ label, description, value, onChange, materialNames }) {
  const materialSummary = Object.entries(
    materialNames.reduce((accumulator, name) => {
      accumulator[name] = (accumulator[name] ?? 0) + 1
      return accumulator
    }, {}),
  )

  return (
    <label className="group-card">
      <div className="group-card-header">
        <div>
          <strong>{label}</strong>
          <p>{description}</p>
        </div>
        <span className="group-count">{materialNames.length}项</span>
      </div>
      <div className="color-input-wrap">
        <input type="color" value={value} onChange={onChange} />
        <code>{value.toUpperCase()}</code>
      </div>
      <div className="group-meta">
        <span>命中 {materialNames.length} 个材质实例</span>
        <span>{materialSummary.length} 个唯一材质名</span>
      </div>
      <details className="group-details">
        <summary>查看底层材质映射</summary>
        <div className="group-tags">
          {materialSummary.map(([name, count]) => (
            <span key={name}>
              {name}
              {count > 1 ? ` ×${count}` : ''}
            </span>
          ))}
        </div>
      </details>
    </label>
  )
}

function App() {
  const [selectedBike] = useState(bikeCatalog[0])
  const [materials, setMaterials] = useState([])
  const [viewerStatus, setViewerStatus] = useState('正在读取本地 GLB 模型...')
  const [groupColorMap, setGroupColorMap] = useState(
    Object.fromEntries(editableGroups.map((group) => [group.key, group.defaultColor])),
  )

  const groupedMaterials = useMemo(
    () =>
      editableGroups.map((group) => ({
        ...group,
        materials: materials.filter((material) => getMaterialGroup(material.name)?.key === group.key),
      })),
    [materials],
  )

  const hiddenMaterialCount = materials.filter((material) => !getMaterialGroup(material.name)).length

  const handleMaterialsReady = (nextMaterials) => {
    setMaterials((current) => {
      if (current.length > 0) {
        return current
      }

      setGroupColorMap(buildInitialGroupColorMap(nextMaterials))
      setViewerStatus(
        `模型已加载，检测到 ${nextMaterials.length} 个材质；当前仅开放 ${editableGroups.length} 个业务分组。`,
      )
      return nextMaterials
    })
  }

  const updateGroupColor = (groupKey, color) => {
    setGroupColorMap((current) => ({
      ...current,
      [groupKey]: color,
    }))
  }

  return (
    <div className="app-shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">MOFRAME / GROUPED COLOR STUDIO</p>
          <h1>材质编辑区已经改成业务分组面板。</h1>
          <p className="hero-text">
            当前不再直接暴露全部原始材质，而是先映射成五个更像产品的分组：车壳、油箱、轮毂、座椅、车架。
            这版属于“基于材质命名的第一轮推断”，足够做 MVP 演示，后面还可以继续微调映射精度。
          </p>
        </div>

        <div className="hero-metrics">
          <div>
            <strong>{materials.length || '--'}</strong>
            <span>模型总材质</span>
          </div>
          <div>
            <strong>{editableGroups.length}</strong>
            <span>开放分组</span>
          </div>
          <div>
            <strong>{hiddenMaterialCount}</strong>
            <span>隐藏非关键材质</span>
          </div>
        </div>
      </section>

      <main className="workspace">
        <aside className="panel sidebar">
          <div className="panel-header">
            <p className="panel-kicker">Bike Catalog</p>
            <h2>车型入口</h2>
          </div>

          <div className="bike-list">
            {bikeCatalog.map((bike) => (
              <div
                key={bike.id}
                className={`bike-card ${bike.id === selectedBike.id ? 'is-active' : ''}`}
              >
                <span className="bike-name">{bike.name}</span>
                <span className="bike-year">{bike.year}</span>
                <span className="bike-note">{bike.note}</span>
              </div>
            ))}
          </div>

          <div className="panel-section">
            <p className="panel-kicker">Viewer Status</p>
            <div className="status-box">
              <span className="status-dot" />
              <p>{viewerStatus}</p>
            </div>
          </div>

          <div className="panel-section">
            <p className="panel-kicker">Source</p>
            <div className="license-card">
              <strong>{ATTRIBUTION_TEXT}</strong>
              <p>
                当前渲染文件来自你本地放入的 <code>ducati_panigale_v4.glb</code>。模型来源仍然是
                原作者 ROY 的 Sketchfab 资源，继续使用时请保留署名要求。
              </p>
            </div>
          </div>
        </aside>

        <section className="panel viewer-panel">
          <div className="viewer-header">
            <div>
              <p className="panel-kicker">Live Preview</p>
              <h2>{selectedBike.name}</h2>
              <p className="viewer-subtitle">本地 GLB + Three.js 实时渲染</p>
            </div>
            <div className="viewer-badges">
              <span>Grouped UI</span>
              <span>Local Asset</span>
              <span>Orbit</span>
            </div>
          </div>

          <div className="viewer-frame compact">
            <Canvas
              camera={{ position: [0, 0.9, 7.4], fov: 24 }}
              dpr={[0.75, 1]}
              frameloop="demand"
              resize={{ debounce: { scroll: 0, resize: 120 } }}
              gl={{ antialias: false, powerPreference: 'low-power' }}
            >
              <color attach="background" args={['#0b0f17']} />
              <ambientLight intensity={1.9} />
              <directionalLight position={[4, 6, 5]} intensity={2.2} />
              <directionalLight position={[-3, 3, -4]} intensity={0.8} />

              <Suspense fallback={<LoadingFallback />}>
                <DucatiModel groupColorMap={groupColorMap} onMaterialsReady={handleMaterialsReady} />
              </Suspense>

              <OrbitControls
                enablePan={false}
                target={[0, 0.3, 0]}
                minDistance={5.5}
                maxDistance={10}
                minPolarAngle={0.9}
                maxPolarAngle={1.7}
              />
            </Canvas>
          </div>
        </section>

        <aside className="panel notes-panel">
          <div className="panel-header">
            <p className="panel-kicker">Grouped Editor</p>
            <h2>配色分组</h2>
          </div>

          <div className="materials-summary">
            <span>{editableGroups.length}</span>
            <p>只保留关键配色项，底层材质明细默认折叠</p>
          </div>

          <div className="group-editor-scroll">
            {groupedMaterials.map((group) => (
              <GroupColorField
                key={group.key}
                label={group.label}
                description={group.description}
                value={groupColorMap[group.key]}
                materialNames={group.materials.map((material) => material.name)}
                onChange={(event) => updateGroupColor(group.key, event.target.value)}
              />
            ))}
          </div>

          <div className="notes-list">
            <article>
              <h3>当前分组方式</h3>
              <p>这版是基于材质命名做的第一轮业务映射，不再把 27 个原始材质全部暴露给用户。</p>
            </article>
            <article>
              <h3>还有哪些没开放</h3>
              <p>
                玻璃、镜面、轮胎、Logo 等非关键材质默认隐藏，避免面板又长又杂，也降低误操作概率。
              </p>
            </article>
          </div>
        </aside>
      </main>
    </div>
  )
}

useGLTF.preload(MODEL_PATH)

export default App
