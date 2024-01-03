import 'package:coursehub/constants/all_courses.dart';
import 'package:coursehub/database/hive_store.dart';
import 'package:coursehub/models/favourites.dart';
import 'package:coursehub/utilities/helpers/helpers.dart';
import 'package:coursehub/widgets/favourite_screen/favourite_tile.dart';
import 'package:flutter/material.dart';
import 'package:flutter_staggered_animations/flutter_staggered_animations.dart';

class GroupedCourses extends StatelessWidget {
  final Function setLoadingCallback;

  const GroupedCourses({super.key, required this.setLoadingCallback});

  @override
  Widget build(BuildContext context) {
    final List<Favourite> favourites = HiveStore.getFavourites();

    Map<String, List<Favourite>> groupedFavourites = {};

    for (var fav in favourites) {
      if (groupedFavourites[fav.code.toLowerCase()] != null) {
        groupedFavourites[fav.code.toLowerCase()]!.add(fav);
      } else {
        groupedFavourites[fav.code.toLowerCase()] = [fav];
      }
    }

    return Expanded(
      child: AnimationLimiter(
        child: ListView.builder(
            itemCount: groupedFavourites.length,
            physics: const BouncingScrollPhysics(),
            itemBuilder: (context, index) {
              String key = groupedFavourites.keys.elementAt(index);

              final course =
                  courses.firstWhere((course) => course['code'] == key);

              List<Widget> children = [];

              children.add(
                Row(
                  children: [
                    const SizedBox(
                      width: 15,
                    ),
                    Text(
                      '${key.toUpperCase()}: ${letterCapitalizer(course['name'] ?? ' ')}',
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: Colors.black),
                    ),
                  ],
                ),
              );

              for (var fav in groupedFavourites[key]!) {
                {
                  children.add(FavouriteTile(
                      favourite: fav, setLoadingCallback: setLoadingCallback));
                }
              }

              children.add(const SizedBox(
                height: 20,
              ));

              return AnimationConfiguration.staggeredList(
                position: index,
                duration: const Duration(milliseconds: 375),
                child: SlideAnimation(
                  verticalOffset: 50.0,
                  child: FadeInAnimation(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: children,
                    ),
                  ),
                ),
              );
            }),
      ),
    );
  }
}