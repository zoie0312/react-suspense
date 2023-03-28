// Cache resources
// http://localhost:3000/isolated/exercise/04.js

import * as React from 'react'
import {
  fetchPokemon,
  PokemonInfoFallback,
  PokemonForm,
  PokemonDataView,
  PokemonErrorBoundary,
} from '../pokemon'
import {createResource} from '../utils'

function PokemonInfo({pokemonResource}) {
  const pokemon = pokemonResource.read()
  return (
    <div>
      <div className="pokemon-info__img-wrapper">
        <img src={pokemon.image} alt={pokemon.name} />
      </div>
      <PokemonDataView pokemon={pokemon} />
    </div>
  )
}

const SUSPENSE_CONFIG = {
  timeoutMs: 4000,
  busyDelayMs: 300,
  busyMinDurationMs: 700,
}
function createPokemonResource(pokemonName) {
  return createResource(fetchPokemon(pokemonName))
}

const PokemonResourceCacheContext = React.createContext();

function PokemonCacheProvider({cacheTime=5000, children}) {
  const cache = React.useRef({})
  
  const getPokemonResource = React.useCallback( (pokemonName) => {
    const lowerName = pokemonName.toLowerCase();
    const now = Date.now();
    let resourceCache = cache.current[lowerName];
    if (resourceCache && resourceCache.resource && (now - resourceCache.start) > cacheTime) {
      // cache.current[lowerName] = {
      //   resource: null
      // }
      delete cache.current[lowerName]['resource']
    }
    let resource = resourceCache?.resource || null;
    if (!resource) {
      resource = createPokemonResource(lowerName);
      cache.current[lowerName] = {
        resource,
        start: Date.now()
      };
    } 
    return resource;
  }, [cacheTime])
  return (
    <PokemonResourceCacheContext.Provider value={getPokemonResource}>
      {children}
    </PokemonResourceCacheContext.Provider>
  )
}


function usePokemonResourceCache() {
  return React.useContext(PokemonResourceCacheContext);
}

function App() {
  const [pokemonName, setPokemonName] = React.useState('')
  const [startTransition, isPending] = React.useTransition(SUSPENSE_CONFIG)
  const [pokemonResource, setPokemonResource] = React.useState(null)
  
  const getPokemonResource =  usePokemonResourceCache();
  
  React.useEffect(() => {
    if (!pokemonName) {
      setPokemonResource(null)
      return
    }
    startTransition(() => {
      const resource = getPokemonResource(pokemonName);
      setPokemonResource(resource)
    })
  }, [pokemonName, startTransition, getPokemonResource])
  
  function handleSubmit(newPokemonName) {
    setPokemonName(newPokemonName)
  }
  
  function handleReset() {
    setPokemonName('')
  }
  
  return (
    <div className="pokemon-info-app">
      <PokemonForm pokemonName={pokemonName} onSubmit={handleSubmit} />
      <hr />
      <div className={`pokemon-info ${isPending ? 'pokemon-loading' : ''}`}>
        {pokemonResource ? (
          <PokemonErrorBoundary
          onReset={handleReset}
          resetKeys={[pokemonResource]}
          >
            <React.Suspense
              fallback={<PokemonInfoFallback name={pokemonName} />}
              >
              <PokemonInfo pokemonResource={pokemonResource} />
            </React.Suspense>
          </PokemonErrorBoundary>
        ) : (
          'Submit a pokemon'
          )}
      </div>
    </div>
  )
}


export default function AppWithProvider () {
  return (
    <PokemonCacheProvider>
      <App/>
    </PokemonCacheProvider>
  )
}
