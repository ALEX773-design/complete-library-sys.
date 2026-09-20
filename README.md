# National Library

A library web application was developed by me to learn the intricacies of backend technology rather than creating static web pages. The application allows signing up, viewing or searching books, issuing the borrowed ones by specifying the due date, and maintaining a list of favorite books. The application also has full-fledged admin features for managing the app.

I started off small but ended up developing an entire dashboard, notification feature, and many things that I did not expect.

## What it does

- Registration/login feature, session management, password security
- Borrowing books, viewing borrowed books, returning the borrowed books, and checking history
- Favorite books as well as keeping a track of recently viewed books
- Profile update feature
- Admin side of application includes features such as checking who is online, managing every account, adding new books, sending notifications through messages, and putting the application in maintenance mode
- A night mode feature

The first account created automatically acts as an admin account, so there is no need to create a different flow for that.

## Built with

Flask along with SQLite as database for backend, while simple HTML/CSS/JS for frontend development is used. No frontend development framework such as React
