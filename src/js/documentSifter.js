export const NODE_BODY="body";
export const NODE_ADS = "ads";
export const NODE_PARAGRAPHS = "paragraphs";
export const NODE_TITLE_SPANS = "titleSpans";
export const NODE_ARTICLE = "article";
export const NODE_HEADER_TITLES="headerTitles";
export const NODE_PAYWALL="paywall"

export default (function() {

  let currentPage=window.location.href;
  let cachedDocumentData = {};

  function resetCache() {
    currentPage = window.location.href;
    cachedDocumentData = {};
  }

  function isHomePage() {
    return !(currentPage.includes('.html'));
  }

  function getDocumentNodes(requestedNodes) {
    if (currentPage !== window.location.href)
      resetCache();
    
    const isCatgoryPage = isHomePage();
    Object.keys(requestedNodes).forEach(function(requestedNode) {
      cachedDocumentData = getDocumentData(requestedNode, cachedDocumentData, isCatgoryPage);
    });
    return cachedDocumentData; // return everything and let the caller destructure and get what the way
  }
  
  return {
    isHomePage,
    getDocumentNodes,
  };


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
function getDocumentData(requestedNode, cachedData, isHomePage=false) {
  if (!(requestedNode in cachedData))
    return FetchFnMapper[requestedNode](cachedData, isHomePage)
  return cachedData;
}


function fetchBody(cachedData) {
  return {
    ...cachedData,
    [NODE_BODY]: document.getElementsByTagName(NODE_BODY)[0]
  }
}

function fetchArticle(cachedData) {
  const updatedCache = getDocumentData(NODE_BODY, cachedData);
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

function fetchParagraphs(cachedData, isHomePage=false) {
  const scopeNode = isHomePage ? NODE_BODY : NODE_ARTICLE;
  const updatedCache = getDocumentData(scopeNode, cachedData, isHomePage);
  let paragraphs = updatedCache[scopeNode].getElementsByTagName('p');   
  let ads = []; // might as well store ads in the process
  if (paragraphs) {
    paragraphs = Array.prototype.filter.call(paragraphs, p => {
      if (p.innerHTML.toLowerCase() === "advertisement") {
        ads.push(p.parentNode.parentNode);
        return false;
      }
      return true;
    });
    updatedCache[NODE_PARAGRAPHS] = paragraphs;
    updatedCache[NODE_ADS]= ads;
  }
  return updatedCache;
};

function fetchAds(cachedData, isHomePage=false) {
  return fetchParagraphs(cachedData, isHomePage);
};

function fetchHeaderTitles(cachedData, isHomePage= false) {
  let headerTitles = [];
  let updatedCache = getDocumentData(NODE_BODY, cachedData, isHomePage);
  if (!isHomePage) {
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
    headerTitles = [...Array.from(h1s)];
  }
  return {
    ...updatedCache,
    [NODE_HEADER_TITLES]: headerTitles
  };
}

function fetchTitleSpans(cachedData, isHomePage=false) {
  const titleSpans = [];
  const titleElement = isHomePage ? "h2" : "h1";

  const scopeNode = isHomePage ? NODE_BODY : NODE_ARTICLE;
  let updatedCache = getDocumentData(scopeNode, cachedData, isHomePage);
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