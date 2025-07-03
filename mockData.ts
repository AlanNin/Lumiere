import { Category } from "./types/category";

export const categories: Category[] = [
  {
    id: 1,
    title: "Following",
    novels: [
      {
        title: "Lord of the Mysteries",
        imageUrl:
          "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1723688384i/58826678.jpg",
        imageAlt: "Lord of the Mysteries",
        rating: 4.5,
      },
      {
        title: "Omniscient Reader's Viewpoint",
        imageUrl:
          "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1602711083i/55673074.jpg",
        imageAlt: "Omniscient Reader's Viewpoint",
        rating: 4.5,
      },
      {
        title: "Tensei Shitara Slime Datta Ken",
        imageUrl: "https://m.media-amazon.com/images/I/91HjK3oSJwL.jpg",
        imageAlt: "Tensei Shitara Slime Datta Ken",
        rating: 4.5,
      },
    ],
  },
  {
    id: 2,
    title: "On Hold",
    novels: [
      // {
      //   id: 4,
      //   title: "Novel 4",
      //   image: "https://picsum.photos/id/13/200/300",
      // },
      // {
      //   id: 5,
      //   title: "Novel 5",
      //   image: "https://picsum.photos/id/14/200/300",
      // },
      // {
      //   id: 6,
      //   title: "Novel 6",
      //   image: "https://picsum.photos/id/15/200/300",
      // },
    ],
  },
  {
    id: 3,
    title: "Completed",
    novels: [
      // {
      //   id: 7,
      //   title: "Novel 7",
      //   image: "https://picsum.photos/id/16/200/300",
      // },
      // {
      //   id: 8,
      //   title: "Novel 8",
      //   image: "https://picsum.photos/id/17/200/300",
      // },
      // {
      //   id: 9,
      //   title: "Novel 9",
      //   image: "https://picsum.photos/id/18/200/300",
      // },
    ],
  },
  {
    id: 4,
    title: "Dropped",
    novels: [
      // {
      //   id: 10,
      //   title: "Novel 10",
      //   image: "https://picsum.photos/id/19/200/300",
      // },
      // {
      //   id: 11,
      //   title: "Novel 11",
      //   image: "https://picsum.photos/id/20/200/300",
      // },
      // {
      //   id: 12,
      //   title: "Novel 12",
      //   image: "https://picsum.photos/id/21/200/300",
      // },
    ],
  },
];
