/* eslint-disable no-param-reassign */
import i18next from 'i18next';
import * as yup from 'yup';
import axios from 'axios';
import _ from 'lodash';
import resources from './locales/index.js';
import view from './view.js';
import parse from './parser.js';

const makeProxyUrl = (url) => {
  const proxyUrl = new URL('/get', 'https://allorigins.hexlet.app');
  proxyUrl.searchParams.set('disableCache', 'true');
  proxyUrl.searchParams.set('url', url);
  return proxyUrl.toString();
};

const validate = (url, state) => {
  const schema = yup.string().required().url().notOneOf(state.feeds.map((feed) => feed.url));
  return schema.validate(url);
};

const handleErrors = (error, state) => {
  switch (error.name) {
    case 'AxiosError':
      state.formInput.error = 'form.errors.network';
      break;
    case 'ValidationError':
      state.formInput.error = `form.errors.${error.type}`;
      break;
    case 'parsingError':
      state.formInput.error = `form.errors.${error.name}`;
      break;
    default:
      throw error;
  }
};

const updatePosts = (watchedState) => {
  const proxyUrls = watchedState.feeds.map((feed) => makeProxyUrl(feed.url));
  const promises = proxyUrls.map((url) => axios(url)
    .then((response) => {
      const { feed, posts } = parse(response.data.contents);
      const watchedPostsTitles = watchedState.posts.map((post) => post.title);
      const newPosts = posts.filter((post) => !watchedPostsTitles.includes(post.title));
      if (newPosts.length) {
        newPosts.forEach((post) => {
          const correspondingFeed = watchedState.feeds.find(() => _.matches(feed.title));
          post.feedId = correspondingFeed.id;
          post.id = _.uniqueId(correspondingFeed.id);
        });
        watchedState.posts.push(...newPosts.reverse());
      }
    }));
  Promise.all(promises).then(() => setTimeout(() => {
    updatePosts(watchedState);
  }, 5000));
};

export default () => {
  const state = {
    formInput: {
      isValid: null,
      error: null,
    },
    loadingProcess: null,
    uiState: {
      viewedPosts: [],
    },
    modal: {
      displayedPost: null,
    },
    feeds: [],
    posts: [],
  };

  const elements = {
    form: document.querySelector('.rss-form'),
    input: document.querySelector('input.form-control'),
    header: document.querySelector('h1.main-header'),
    label: document.querySelector('label[for="url-input"]'),
    addBtn: document.querySelector('button[aria-label="add"]'),
    example: document.querySelector('p.example'),
    feedback: document.querySelector('p.feedback'),
    postsContainer: document.querySelector('div.posts'),
    feedsContainer: document.querySelector('div.feeds'),
    modalTitle: document.querySelector('h5.modal-title'),
    modalBody: document.querySelector('div.modal-body'),
    readBtn: document.querySelector('div.modal-footer > a'),
    closeBtn: document.querySelector('div.modal-footer > button'),
  };

  const langSet = i18next.createInstance();
  langSet.init({
    lng: 'ru',
    debug: false,
    resources,
  }).then(() => {
    const watchedState = view(state, elements, langSet);
    const { form, postsContainer } = elements;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const urlInput = new FormData(e.target).get('url');
      const proxyUrl = makeProxyUrl(urlInput);

      validate(urlInput, state)
        .then(() => {
          watchedState.loadingProcess = 'loading';
          return axios(proxyUrl);
        })
        .then((response) => {
          const { feed, posts } = parse(response.data.contents);
          feed.id = _.uniqueId();
          feed.url = urlInput;
          posts.forEach((post) => {
            post.feedId = feed.id;
            post.id = _.uniqueId(feed.id);
          });
          watchedState.feeds.push(feed);
          watchedState.posts.push(...posts.reverse());
          watchedState.loadingProcess = 'loaded';
          watchedState.formInput.isValid = true;
          watchedState.formInput.error = null;
        })
        .catch((err) => {
          handleErrors(err, state);
          watchedState.loadingProcess = 'failure';
          watchedState.formInput.isValid = true;
          watchedState.formInput.isValid = false;
        });
    });

    postsContainer.addEventListener('click', (e) => {
      const post = state.posts.find(({ id }) => id === e.target.dataset.id);
      watchedState.uiState.viewedPosts.push(post);
      if (e.target.nodeName === 'BUTTON') {
        watchedState.modal.displayedPost = post;
      }
    });

    updatePosts(watchedState, state.urls);
  });
};
