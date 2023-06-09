import onChange from 'on-change';
import * as render from './renders.js';

export default (state, elements, langSet) => onChange(state, (path) => {
  switch (path) {
    case 'loadingProcess':
      render.renderAddButton(state, elements, langSet);
      break;
    case 'formInput.isValid':
      render.renderForm(state, elements, langSet);
      break;
    case 'feeds':
      render.renderFeeds(state, elements, langSet);
      break;
    case 'posts':
      render.renderPosts(state, elements, langSet);
      break;
    case 'uiState.viewedPosts':
      render.renderPosts(state, elements, langSet);
      break;
    case 'modal.displayedPost':
      render.renderModal(state, elements);
      break;
    default:
      break;
  }
});
