import { useState, useEffect } from 'react';
import { api, ApiError } from '../api/client';
import ReactMarkdown from 'react-markdown';

interface Challenge {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  solveCount: number;
  currentPoints: number;
  solved: boolean;
}

interface ChallengeDetails extends Challenge {
  description: string;
  hints: string[];
  files: { name: string; url: string }[];
  authorName: string;
}

export function Challenges() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [flag, setFlag] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchChallenges();
  }, []);

  const fetchChallenges = async () => {
    try {
      const data: any = await api.getChallenges();
      setChallenges(data.data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load challenges');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const openChallenge = async (id: string) => {
    try {
      const data: any = await api.getChallenge(id);
      setSelectedChallenge(data.data);
      setFlag('');
      setSubmitError('');
      setSubmitSuccess('');
      setIsModalOpen(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChallenge) return;

    setIsSubmitting(true);
    setSubmitError('');
    setSubmitSuccess('');

    try {
      const data: any = await api.submitFlag(selectedChallenge.id, flag);
      if (data.data.isCorrect) {
        setSubmitSuccess('Flag is correct! Points awarded.');
        // Update local state to show as solved
        setChallenges(challenges.map(c => 
          c.id === selectedChallenge.id ? { ...c, solved: true, solveCount: c.solveCount + 1 } : c
        ));
        setSelectedChallenge({ ...selectedChallenge, solved: true });
      } else {
        setSubmitError('Incorrect flag. Try again.');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(err.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = ['all', ...Array.from(new Set(challenges.map((c) => c.category)))];
  
  const filteredChallenges = selectedCategory === 'all' 
    ? challenges 
    : challenges.filter((c) => c.category === selectedCategory);

  if (isLoading) {
    return <div className="loading-spinner"></div>;
  }

  if (error) {
    return (
      <div className="container page">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="container page animate-in">
      <div className="section-header">
        <h1 className="section-title">
          Available <span>Challenges</span>
        </h1>
      </div>

      <div className="category-tabs">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`category-tab ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="challenge-grid">
        {filteredChallenges.map((challenge) => (
          <div
            key={challenge.id}
            className={`challenge-card ${challenge.solved ? 'solved' : ''}`}
            onClick={() => openChallenge(challenge.id)}
          >
            <div className="challenge-card-header">
              <div className="challenge-card-title">{challenge.title}</div>
            </div>
            
            <div className="flex gap-2">
              <span className={`badge badge-${challenge.difficulty}`}>
                {challenge.difficulty}
              </span>
              <span className="badge badge-category">
                {challenge.category}
              </span>
            </div>

            <div className="challenge-card-footer">
              <div className="challenge-card-solves">{challenge.solveCount} solves</div>
              <div className="challenge-card-points">{challenge.currentPoints} pts</div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && selectedChallenge && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in"
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'relative' }}
          >
            <button 
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
              onClick={() => setIsModalOpen(false)}
            >
              ✕
            </button>

            <div className="mb-6 flex justify-between items-start pr-8">
              <div>
                <h2 className="text-2xl font-mono font-bold text-white mb-2">
                  {selectedChallenge.title}
                </h2>
                <div className="flex gap-2">
                  <span className={`badge badge-${selectedChallenge.difficulty}`}>
                    {selectedChallenge.difficulty}
                  </span>
                  <span className="badge badge-category">
                    {selectedChallenge.category}
                  </span>
                  {selectedChallenge.solved && (
                    <span className="badge badge-solved">Solved</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-mono font-bold text-yellow-500">
                  {selectedChallenge.currentPoints}
                </div>
                <div className="text-xs text-gray-400">POINTS</div>
              </div>
            </div>

            <div className="prose prose-invert prose-cyan max-w-none mb-8">
              <ReactMarkdown>{selectedChallenge.description}</ReactMarkdown>
            </div>

            {selectedChallenge.files && selectedChallenge.files.length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Files</h3>
                <div className="flex flex-wrap gap-3">
                  {selectedChallenge.files.map((file, i) => (
                    <a 
                      key={i} 
                      href={file.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                    >
                      📎 {file.name}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-gray-800">
              <form onSubmit={handleSubmit} className="flag-input-wrapper">
                <input
                  type="text"
                  className="flag-input"
                  placeholder="flag{...}"
                  value={flag}
                  onChange={(e) => setFlag(e.target.value)}
                  disabled={selectedChallenge.solved || isSubmitting}
                />
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={selectedChallenge.solved || isSubmitting || !flag}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Flag'}
                </button>
              </form>
              
              {submitError && <div className="error-message mt-4">{submitError}</div>}
              {submitSuccess && <div className="success-message mt-4">{submitSuccess}</div>}
            </div>
            
            <div className="mt-4 text-right text-xs text-gray-500">
              Author: {selectedChallenge.authorName || 'Admin'} • {selectedChallenge.solveCount} solves
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
