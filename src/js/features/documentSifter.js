export const NODE_BODY="body";
export const NODE_ADS = "ads";
export const NODE_PARAGRAPHS = "paragraphs";
export const NODE_TITLE_SPANS = "titleSpans";
export const NODE_ARTICLE = "article";
export const NODE_HEADER_TITLES="headerTitles";
export const NODE_PAYWALL="paywall"

export default (function() {

  let currentPage;
  let cachedDocumentData = {};

  function getDocumentData(requestedNodes={}) {

    (function resetCacheIfNewPage() {
      if (currentPage != window.location.href) {
        currentPage = window.location.href,
        cachedDocumentData = { isArticlePage: currentPage.includes('.html') };
      }
    })();  

    Object.keys(requestedNodes).forEach(function(requestedNode) {
      cachedDocumentData = getUpdatedCacheWith(requestedNode, cachedDocumentData);
    });
    
    return cachedDocumentData; // return everything and let the caller destructure and get what the way
  }
  
  return getDocumentData;
})();

const FetchFnMapper = {
  [NODE_BODY]: fetchBody,
  [NODE_ARTICLE]: fetchArticle,
  [NODE_PAYWALL]: fetchPaywall,
  [NODE_PARAGRAPHS]: fetchParagraphs,
  [NODE_ADS]: fetchAds,
  [NODE_TITLE_SPANS]: fetchTitleSpans,
  [NODE_HEADER_TITLES]: fetchHeaderTitles
}


// getDocumentData always fetches data directly from document // and not cache
function getUpdatedCacheWith(requestedNode, cachedData) {
  return (requestedNode in cachedData)
    ? cachedData
    : FetchFnMapper[requestedNode](cachedData);
}

function fetchBody(cachedData) {
  return {
    ...cachedData,
    [NODE_BODY]: document.getElementsByTagName(NODE_BODY)[0]
  }
}

function fetchArticle(cachedData) {
  const updatedCache = getUpdatedCacheWith(NODE_BODY, cachedData);
  return {
    ...updatedCache,
    [NODE_ARTICLE]: document.getElementsByTagName(NODE_ARTICLE)[0]
  }
};

function fetchPaywall(cachedData) {
  return {
    ...cachedData,
    [NODE_PAYWALL]: document.getElementById('gateway-content')
  }
}

function fetchParagraphs(cachedData) {
  const {isArticlePage} = cachedData;
  const scopeNode = isArticlePage ? NODE_ARTICLE : NODE_BODY;
  const updatedCache = getUpdatedCacheWith(scopeNode, cachedData);
  let paragraphs = updatedCache[scopeNode].getElementsByTagName('p');   
  let ads = []; // might as well store ads in the process on article pages

  if (paragraphs && isArticlePage) {
    [paragraphs, ads] = separateOutAdsFrom(paragraphs);
  }

  return {
    ...updatedCache,
    [NODE_PARAGRAPHS]: paragraphs,
    [NODE_ADS]: ads
  };

  function separateOutAdsFrom(paragraphs) {
    const ads = [];
    const contentParagraphs = Array.prototype.filter.call(paragraphs, p => {
      if (p.innerHTML.toLowerCase() === "advertisement") {
        ads.push(p.parentNode.parentNode);
        return false;
      }
      return true;
    });
    return [contentParagraphs, ads];
  }
};

function fetchAds(cachedData) {
  return fetchParagraphs(cachedData);
};

function fetchHeaderTitles(cachedData) {
  let headerTitles = [];
  let updatedCache = getUpdatedCacheWith(NODE_BODY, cachedData);

  if (updatedCache.isArticlePage) {
    const sections = updatedCache[NODE_BODY].getElementsByTagName('section');
    if (sections) {
      const goodSections = Array.prototype.filter.call(sections, function(section) {
        return (!(
          section.hasAttribute("name") 
          || section.hasAttribute("aria-labelledby")
          || section.id
          || section.parentNode.tagName.toLowerCase() !== "header"
        ))
      });
      if (goodSections && goodSections.length === 1 && goodSections[0].children[1])
          headerTitles.push(goodSections[0].children[1].getElementsByTagName('a')[0]);
    }
  }
  else {
    const h1s = document.getElementsByTagName('h1');
    headerTitles = Array.from(h1s);
  }
  return {
    ...updatedCache,
    [NODE_HEADER_TITLES]: headerTitles
  };
}

function fetchTitleSpans(cachedData) {
  const titleSpans = [];
  const {isArticlePage} = cachedData;
  const titleElement = isArticlePage ? "h1" : "h2";
  const scopeNode = isArticlePage ? NODE_ARTICLE : NODE_BODY;

  let updatedCache = getUpdatedCacheWith(scopeNode, cachedData);
  const titles = updatedCache[scopeNode].getElementsByTagName(titleElement);

  for (let title of titles) {
    const spans = title.getElementsByTagName('span');
    if (spans.length) {
      for (let span of spans)
        titleSpans.push(span);
    } else {
      titleSpans.push(title);
    }
  }
  return {
    ...updatedCache,
    [NODE_TITLE_SPANS]: titleSpans
  };
}