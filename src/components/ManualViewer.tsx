/**
 * LIFE SCORE™ Manual Viewer Component
 *
 * Fetches and renders markdown documentation from the API.
 * Supports CSM (Customer Service Manual), Tech Support, and User Manual.
 *
 * Features:
 * - Loading states
 * - Error handling
 * - Basic markdown-to-HTML conversion
 * - Search/filter capability (future)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { ManualTabType } from './HelpModal';
import './ManualViewer.css';

interface ManualViewerProps {
  type: ManualTabType;
  userEmail?: string | null;
}

interface ManualSection {
  id: string;
  title: string;
  content: string;
  subsections?: ManualSection[];
}

interface ManualContent {
  title: string;
  lastUpdated: string;
  sections: ManualSection[];
  rawContent?: string;
}

// Sanitize HTML to prevent XSS — strip dangerous tags, attributes, and protocols
function sanitizeHtml(html: string): string {
  // Remove script tags and their content
  let clean = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  // Remove event handler attributes (onclick, onerror, onload, etc.)
  clean = clean.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  // Remove javascript: protocol in href/src attributes
  clean = clean.replace(/(?:href|src)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, 'href="#"');
  // Remove data: protocol in src (can be used for XSS)
  clean = clean.replace(/src\s*=\s*(?:"data:[^"]*"|'data:[^']*')/gi, 'src=""');
  // Remove style tags
  clean = clean.replace(/<style[\s\S]*?<\/style>/gi, '');
  // Remove iframe, object, embed, form tags
  clean = clean.replace(/<\/?(iframe|object|embed|form|input|textarea|button|select)[\s\S]*?>/gi, '');
  return clean;
}

// Basic markdown to HTML converter
function markdownToHtml(markdown: string): string {
  let html = markdown;

  // Headers
  html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');

  // Code blocks
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/gim, '<pre><code class="language-$1">$2</code></pre>');
  html = html.replace(/`([^`]+)`/gim, '<code>$1</code>');

  // Links - handle anchor links and external links differently
  // Only allow http(s) and anchor (#) links — block javascript: and data: protocols
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, (_match, text, url) => {
    if (url.startsWith('#')) {
      return `<a href="${url}" class="internal-link" data-section="${url.slice(1)}">${text}</a>`;
    } else if (url.startsWith('http://') || url.startsWith('https://')) {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="external-link">${text}</a>`;
    } else {
      // Block non-http protocols (javascript:, data:, vbscript:, etc.)
      return `<span class="external-link">${text}</span>`;
    }
  });

  // Unordered lists
  html = html.replace(/^\s*[-*] (.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)\n(?=<li>)/gim, '$1');
  html = html.replace(/(<li>.*<\/li>)(?=\n[^<]|\n$|$)/gims, '<ul>$1</ul>');

  // Ordered lists
  html = html.replace(/^\d+\. (.*$)/gim, '<li>$1</li>');

  // Tables (basic support)
  html = html.replace(/\|(.+)\|/g, (match) => {
    const cells = match.split('|').filter(c => c.trim());
    const row = cells.map(c => `<td>${c.trim()}</td>`).join('');
    return `<tr>${row}</tr>`;
  });
  html = html.replace(/(<tr>.*<\/tr>)\n(?=<tr>)/gim, '$1');
  html = html.replace(/(<tr>.*<\/tr>)+/gim, '<table>$&</table>');

  // Horizontal rules
  html = html.replace(/^---$/gim, '<hr />');

  // Paragraphs (wrap remaining text)
  html = html.replace(/^(?!<[a-z])(.*[^\n])$/gim, '<p>$1</p>');

  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/gim, '');

  // Sanitize the final HTML to strip any remaining dangerous content
  return sanitizeHtml(html);
}

// Parse markdown into sections
function parseMarkdownSections(content: string): ManualSection[] {
  const sections: ManualSection[] = [];
  const lines = content.split('\n');
  let currentSection: ManualSection | null = null;
  let contentBuffer: string[] = [];

  const flushSection = () => {
    if (currentSection) {
      currentSection.content = contentBuffer.join('\n').trim();
      sections.push(currentSection);
      contentBuffer = [];
    }
  };

  for (const line of lines) {
    const h2Match = line.match(/^## (.+)$/);
    if (h2Match) {
      flushSection();
      currentSection = {
        id: h2Match[1].toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        title: h2Match[1],
        content: '',
      };
    } else if (currentSection) {
      contentBuffer.push(line);
    }
  }

  flushSection();

  // If no sections found, treat entire content as one section
  if (sections.length === 0 && content.trim()) {
    sections.push({
      id: 'content',
      title: 'Content',
      content: content.trim(),
    });
  }

  return sections;
}

const ManualViewer: React.FC<ManualViewerProps> = ({ type, userEmail }) => {
  const [content, setContent] = useState<ManualContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [accessDenied, setAccessDenied] = useState(false);

  // Fetch manual content
  useEffect(() => {
    const fetchContent = async () => {
      setIsLoading(true);
      setError(null);
      setAccessDenied(false);

      try {
        // Build URL with email for authorization
        const url = userEmail
          ? `/api/emilia/manuals?type=${type}&email=${encodeURIComponent(userEmail)}`
          : `/api/emilia/manuals?type=${type}`;
        const response = await fetch(url);

        if (!response.ok) {
          // Check for access denied (403)
          if (response.status === 403) {
            const errorData = await response.json();
            if (errorData.restricted) {
              setAccessDenied(true);
              setIsLoading(false);
              return;
            }
          }
          throw new Error(`Failed to load manual: ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.content) {
          const sections = parseMarkdownSections(data.content);
          setContent({
            title: data.title || getManualTitle(type),
            lastUpdated: data.lastUpdated || new Date().toISOString().split('T')[0],
            sections,
            rawContent: data.content,
          });
          // Expand first section by default
          if (sections.length > 0) {
            setExpandedSections(new Set([sections[0].id]));
          }
        } else {
          throw new Error(data.error || 'Invalid response');
        }
      } catch (err) {
        console.error('[ManualViewer] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load manual');
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [type, userEmail]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (content) {
      setExpandedSections(new Set(content.sections.map((s) => s.id)));
    }
  };

  const collapseAll = () => {
    setExpandedSections(new Set());
  };

  // Ref for the sections container
  const sectionsRef = useRef<HTMLDivElement>(null);

  // Handle clicks on links within the content
  const handleContentClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    // Check if clicked on a link
    if (target.tagName === 'A') {
      const link = target as HTMLAnchorElement;

      // Handle internal anchor links
      if (link.classList.contains('internal-link')) {
        e.preventDefault();
        const sectionId = link.getAttribute('data-section');

        if (sectionId && content) {
          // Find the section that matches
          const targetSection = content.sections.find(s =>
            s.id === sectionId ||
            s.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') === sectionId
          );

          if (targetSection) {
            // Expand that section
            setExpandedSections(prev => new Set([...prev, targetSection.id]));

            // Scroll to it within the sections container
            setTimeout(() => {
              const sectionEl = sectionsRef.current?.querySelector(`[data-section-id="${targetSection.id}"]`);
              if (sectionEl) {
                sectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }, 100);
          }
        }
        return;
      }

      // External links already have target="_blank", but ensure they work
      if (link.classList.contains('external-link') && !link.getAttribute('target')) {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      }
    }
  }, [content]);

  // Loading state
  if (isLoading) {
    return (
      <div className="manual-viewer loading">
        <div className="manual-loading">
          <div className="manual-loading-spinner"></div>
          <span>Loading documentation...</span>
        </div>
      </div>
    );
  }

  // Access denied state
  if (accessDenied) {
    return (
      <div className="manual-viewer error">
        <div className="manual-error">
          <span className="error-icon">🔒</span>
          <p className="error-text">Access Restricted</p>
          <p className="error-subtext">This manual is only available to authorized administrators.</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="manual-viewer error">
        <div className="manual-error">
          <span className="error-icon">!</span>
          <p className="error-text">{error}</p>
          <button className="error-retry" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (!content || content.sections.length === 0) {
    return (
      <div className="manual-viewer empty">
        <div className="manual-empty">
          <span className="empty-icon">📄</span>
          <p>No documentation available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="manual-viewer">
      {/* Header */}
      <div className="manual-header">
        <div className="manual-meta">
          <span className="manual-type-badge">{getManualTitle(type)}</span>
          <span className="manual-updated">Updated: {content.lastUpdated}</span>
        </div>
        <div className="manual-actions">
          <button className="manual-action-btn" onClick={expandAll} title="Expand all">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z" />
            </svg>
            <span>Expand All</span>
          </button>
          <button className="manual-action-btn" onClick={collapseAll} title="Collapse all">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" />
            </svg>
            <span>Collapse All</span>
          </button>
        </div>
      </div>

      {/* Sections */}
      <div className="manual-sections" ref={sectionsRef} onClick={handleContentClick}>
        {content.sections.map((section) => (
          <div
            key={section.id}
            data-section-id={section.id}
            className={`manual-section ${expandedSections.has(section.id) ? 'expanded' : ''}`}
          >
            <button
              className="manual-section-header"
              onClick={() => toggleSection(section.id)}
            >
              <span className="section-title">{section.title}</span>
              <span className="section-toggle">
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path
                    fill="currentColor"
                    d={
                      expandedSections.has(section.id)
                        ? 'M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z'
                        : 'M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z'
                    }
                  />
                </svg>
              </span>
            </button>
            {expandedSections.has(section.id) && (
              <div
                className="manual-section-content"
                dangerouslySetInnerHTML={{ __html: markdownToHtml(section.content) }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Helper function to get manual title
function getManualTitle(type: ManualTabType): string {
  switch (type) {
    case 'csm':
      return 'Customer Service Manual';
    case 'tech':
      return 'Technical Support Manual';
    case 'user':
      return 'User Manual';
    case 'legal':
      return 'Legal Compliance';
    case 'schema':
      return 'App Schema & Database';
    case 'equations':
      return 'Judge Equations';
    default:
      return 'Documentation';
  }
}

export default ManualViewer;
