function createToolRegistry() {
  const tools = [
    {
      id: 'web_fetch',
      kind: 'builtin',
      description: 'Fetch and normalize webpage content through the parser service.',
    },
    {
      id: 'search',
      kind: 'builtin',
      description: 'Search over captured content and future external sources.',
    },
    {
      id: 'note_lookup',
      kind: 'builtin',
      description: 'Resolve note context from the core note store.',
    },
  ];

  return {
    list() {
      return tools.slice();
    },
  };
}

module.exports = {
  createToolRegistry,
};
