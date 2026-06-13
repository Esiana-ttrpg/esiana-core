import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWiki } from '@/contexts/WikiContext';
import { X } from 'lucide-react';

interface Plugin {
  id: string;
  name: string;
  version: string;
  githubUrl: string;
  isEnabled: boolean;
}

export function PluginsTab() {
  const { campaignHandle } = useParams<{ campaignHandle: string }>();
  const { campaign } = useWiki();
  const campaignKey = campaign?.id ?? campaignHandle;
  const { token } = useAuth();
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [newPluginUrl, setNewPluginUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPlugins = async () => {
      if (!campaignKey || !token) return;
      try {
        const response = await fetch(`/api/campaigns/${campaignKey}/plugins`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch plugins');
        const data = await response.json();
        setPlugins(data);
      } catch (err) {
        console.error('Error fetching plugins:', err);
        setError('Failed to load plugins');
      }
    };
    fetchPlugins();
  }, [campaignKey, token]);

  const handleAddPlugin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newPluginUrl.trim()) {
      setError('GitHub URL is required');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignKey}/plugins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ githubUrl: newPluginUrl.trim() })
      });
      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to install plugin');
      } else {
        setPlugins([...plugins, { id: Date.now().toString(), name: 'New Plugin', version: '1.0.0', githubUrl: newPluginUrl, isEnabled: true }]);
        setNewPluginUrl('');
      }
    } catch (err) {
      console.error('Error adding plugin:', err);
      setError('Failed to install plugin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h2 className="mb-4 text-lg font-semibold">Plugins</h2>
      <div className="space-y-4">
        {plugins.length === 0 && <p className="text-sm text-muted">No plugins installed</p>}
        {plugins.map(plugin => (
          <div key={plugin.id} className="border border-border rounded p-3 mb-2">
            <h3 className="text-sm font-medium">{plugin.name}</h3>
            <p className="text-sm text-muted">Version: {plugin.version}</p>
            <p className="text-sm text-muted">URL: {plugin.githubUrl}</p>
            <button
              onClick={() => setPlugins(plugins.filter(p => p.id !== plugin.id))}
              className="ml-2 text-sm text-muted"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <div className="mb-4">
        <label className="block text-sm text-foreground">Add Plugin from GitHub</label>
        <input
          type="text"
          value={newPluginUrl}
          onChange={(e) => setNewPluginUrl(e.target.value)}
          placeholder="github.com/username/plugin"
          className="w-full px-3 py-2 border border-border rounded"
        />
        <button
          type="button"
          onClick={handleAddPlugin}
          disabled={loading || newPluginUrl === ''}
          className="rounded bg-primary px-4 py-2 text-sm font-medium hover:bg-primary-hover"
        >
          {loading ? 'Installing...' : 'Add Plugin'}
        </button>
      </div>
      {error && (
        <div className="flex items-start gap-2 rounded bg-red-950 p-3 text-red-200">
          <X className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
