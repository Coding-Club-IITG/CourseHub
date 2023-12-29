import 'package:flutter/material.dart';
import 'package:flutter_svg/svg.dart';
import 'package:provider/provider.dart';
import '../../apis/authentication/login.dart';
import '../../database/cache_store.dart';
import '../../widgets/common/custom_snackbar.dart';
import '../../providers/navigation_provider.dart';

class MenuDrawer extends StatelessWidget {
  const MenuDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    final navigationProvider = context.read<NavigationProvider>();
    return Drawer(
      width: 250,
      backgroundColor: Colors.black,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(
            height: 200,
            child: DrawerHeader(
              decoration: BoxDecoration(
                color: Colors.black,
              ),
              child: Text(
                'CourseHub',
                style: TextStyle(fontSize: 32),
              ),
            ),
          ),
          MenuItems(
              icon: const Icon(
                Icons.library_books_outlined,
                color: Colors.white,
              ),
              onPressed: () {
                if (CacheStore.isGuest) {
                  Navigator.of(context).pop();

                  showSnackBar(
                      'Login with outlook to use this feature!', context);
                  return;
                }

                navigationProvider.changePageNumber(6);
                navigationProvider.key.currentState!.closeDrawer();
              },
              title: 'Exam Schedule'),
          MenuItems(
              icon: const Icon(
                Icons.percent_outlined,
                color: Colors.white,
              ),
              onPressed: () {
                if (CacheStore.isGuest) {
                  Navigator.of(context).pop();

                  showSnackBar(
                      'Login with outlook to use this feature!', context);
                  return;
                }

                navigationProvider.changePageNumber(10);
                navigationProvider.key.currentState!.closeDrawer();
              },
              title: 'Attendance'),
          MenuItems(
              icon: const Icon(
                Icons.star_border_rounded,
                color: Colors.white,
              ),
              onPressed: () {
                if (CacheStore.isGuest) {
                  Navigator.of(context).pop();

                  showSnackBar(
                      'Login with outlook to use this feature!', context);
                  return;
                }

                navigationProvider.changePageNumber(9);
                navigationProvider.key.currentState!.closeDrawer();
              },
              title: 'Favourites'),
          MenuItems(
              icon: const Icon(
                Icons.handshake_outlined,
                color: Colors.white,
              ),
              onPressed: () {
                showSnackBar('This feature coming soon!', context);
                navigationProvider.key.currentState!.closeDrawer();
              },
              title: 'Special Thanks'),
          MenuItems(
              icon: const Icon(
                Icons.feedback_outlined,
                color: Colors.white,
              ),
              onPressed: () {
                if (CacheStore.isGuest) {
                  Navigator.of(context).pop();
                  showSnackBar(
                      'Login with outlook to use this feature!', context);
                  return;
                }
                navigationProvider.changePageNumber(8);
                navigationProvider.key.currentState!.closeDrawer();
              },
              title: 'Feedback/ Bugs'),
          MenuItems(
              icon: const Icon(
                Icons.people_alt_outlined,
                color: Colors.white,
              ),
              onPressed: () {
                navigationProvider.changePageNumber(7);

                navigationProvider.key.currentState!.closeDrawer();
              },
              title: 'Team'),
          const Spacer(),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Text(
              'Designed, Developed &\nMaintained by',
              style: TextStyle(fontWeight: FontWeight.w400),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
            child: Row(
              children: [
                SvgPicture.asset('assets/cc_logo.svg'),
                const SizedBox(
                  width: 10,
                ),
                const Column(
                  children: [
                    Text(
                      'Coding Club',
                      style: TextStyle(
                        fontFamily: 'Raleway',
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    SizedBox(
                      height: 2,
                    ),
                    Text(
                      'IIT Guwahati',
                      style: TextStyle(
                          fontWeight: FontWeight.w500, fontFamily: 'Raleway'),
                    )
                  ],
                )
              ],
            ),
          ),
          Material(
            color: Colors.red,
            child: InkWell(
              splashColor: Colors.redAccent,
              onTap: () {
                showDialog(
                  context: context,
                  builder: (context) => const LogoutDialog(),
                );
              },
              child: Container(
                height: 70,
                padding:
                    const EdgeInsets.symmetric(horizontal: 30, vertical: 10),
                child: const Row(
                  children: [
                    Icon(
                      Icons.arrow_circle_right_outlined,
                      color: Colors.white,
                      size: 32,
                    ),
                    SizedBox(
                      width: 10,
                    ),
                    Text(
                      'Logout',
                      style: TextStyle(fontSize: 18),
                    )
                  ],
                ),
              ),
            ),
          )
        ],
      ),
    );
  }
}

class MenuItems extends StatelessWidget {
  final Function onPressed;
  final String title;
  final Icon icon;
  const MenuItems({
    super.key,
    required this.icon,
    required this.onPressed,
    required this.title,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      splashColor: Colors.transparent,
      title: Row(
        children: [
          icon,
          const SizedBox(
            width: 15,
          ),
          Text(
            title,
            style: const TextStyle(
                fontWeight: FontWeight.w400, color: Colors.white),
          ),
        ],
      ),
      onTap: () {
        onPressed();
      },
    );
  }
}

class LogoutDialog extends StatelessWidget {
  const LogoutDialog({super.key});

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(8))),
      child: Container(
        width: 320,
        padding: const EdgeInsets.all(8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Image.asset(
              'assets/logout.png',
              width: 160,
            ),
            const SizedBox(
              height: 24,
            ),
            const Text(
              'Oh no! You\'re leaving.....\nAre you sure?',
              style: TextStyle(color: Colors.black),
              textAlign: TextAlign.center,
            ),
            const SizedBox(
              height: 10,
            ),
            ElevatedButton(
              style: const ButtonStyle(
                backgroundColor: MaterialStatePropertyAll(Colors.amber),
                foregroundColor: MaterialStatePropertyAll(Colors.black),
                overlayColor: MaterialStatePropertyAll(Colors.white60),
              ),
              onPressed: () {
                Navigator.of(context).pop();
              },
              child: const Text('Naah, Just Kidding'),
            ),
            ElevatedButton(
              style: ButtonStyle(
                foregroundColor: const MaterialStatePropertyAll(Colors.black),
                overlayColor: MaterialStatePropertyAll(Colors.amber[200]),
                side: const MaterialStatePropertyAll(
                  BorderSide(color: Colors.amber),
                ),
              ),
              onPressed: () async {
                await logoutHandler(context);
              },
              child: const Text('Yes, Log Me Out'),
            )
          ],
        ),
      ),
      
    );
  }
}
