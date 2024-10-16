/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
import { NextRequest } from 'next/server'
import { ImageResponse } from '@vercel/og'

export const config = {
  runtime: 'experimental-edge',
}

const IMAGE_WIDTH = 1200
const IMAGE_HEIGHT = 628

export default async function handle(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const username = searchParams.get('username')
  const dark = searchParams.has('dark')

  if (!username) {
    return errorResponse('No username provided.')
  }

  const res = await fetch(`https://api.github.com/users/${username}`, {
    headers: { Authorization: `Bearer ${process.env.GITHUB_PERSONAL_TOKEN}` },
  })
  if (res.status === 404) {
    return errorResponse(`No GitHub user with username “${username}”.`)
  }
  if (res.status !== 200) {
    try {
      const json = await res.json()
      console.log(json.message)
    } catch (_) {}
    return errorResponse(
      'An error occurred when fetching information about the user.'
    )
  }
  const user = await res.json()
  const contribs = await getContribsByWeek(username)

  return new ImageResponse(
    (
      <div tw="flex w-full h-full p-8 items-stretch">
        <div
          tw={`${
            dark ? 'bg-slate-900 text-slate-200' : 'bg-white text-black'
          } flex-1 items-stretch flex flex-col text-2xl shadow-xl`}
        >
          <div tw="flex items-center flex-1 border-4">
            <div tw="flex w-1/3 justify-end pb-12 mr-12">
              <div tw="flex flex-col items-center">
                <img
                  src={user.avatar_url}
                  tw="w-64 h-64 rounded-full shadow-2xl mb-4"
                  style={{ objectPosition: 'center', objectFit: 'cover' }}
                />
                <div
                  tw={`text-xl ${dark ? 'text-slate-300' : 'text-slate-500'}`}
                >{`Since ${new Date(user.created_at).toLocaleDateString(
                  'en-US',
                  {
                    month: 'long',
                    year: 'numeric',
                  }
                )}`}</div>
              </div>
            </div>
            <div tw="flex w-2/3 flex-col pr-16">
              <div tw="text-6xl">{user.name}</div>
              <div
                tw={`text-3xl mb-2 flex ${
                  dark ? `text-slate-300` : `text-slate-400`
                }`}
              >
                <span tw={dark ? `text-slate-500` : `text-slate-400`}>
                  github.com/
                </span>
                {user.login}
              </div>
              {user.bio && (
                <div tw="text-2xl">
                  {user.bio
                    .replace(
                      /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
                      ''
                    )
                    .trim()}
                </div>
              )}
              <div tw="flex mb-2 mt-8">
                👥{' '}
                {user.followers === 1
                  ? `${user.followers} follower`
                  : `${user.followers.toLocaleString('en-US')} followers`}{' '}
                · {`${user.following.toLocaleString('en-US')} following`}
              </div>
              <div tw="flex flex-wrap">
                {user.company && (
                  <div tw="flex mb-2 mr-4">🏢 {user.company}</div>
                )}
                {user.location && (
                  <div tw="flex mb-2 mr-4">📍 {user.location}</div>
                )}
                {user.twitter_username && (
                  <div tw="flex mb-2">🕊 @{user.twitter_username}</div>
                )}
              </div>
            </div>
          </div>
          <div tw="flex flex-shrink-0 border -mt-24 justify-between p-2">
            <div tw="flex">
              {contribs.map((week, wIndex) => (
                <div key={wIndex} tw="flex flex-col">
                  {week.map((day, dIndex) => (
                    <div
                      key={dIndex}
                      tw={`w-2 h-2 m-0.5 ${dayColor(day, dark)}`}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div tw="flex-1" />
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=84x84&bgcolor=${
                dark ? '0f172a' : 'fff'
              }&color=${
                dark ? 'cbd5e1' : '64748b'
              }&data=${`https://github.com/${username}`}`}
            />
          </div>
        </div>
      </div>
    ),
    {
      width: IMAGE_WIDTH,
      height: IMAGE_HEIGHT,
      headers: { 'cache-control': 'public, max-age=60' },
    }
  )
}

function dayColor(day: number, dark: boolean) {
  return day === 0
    ? dark
      ? 'bg-slate-700'
      : 'bg-slate-100'
    : day === 1
    ? dark
      ? 'bg-green-900'
      : 'bg-green-100'
    : day === 2
    ? dark
      ? 'bg-green-800'
      : 'bg-green-200'
    : day === 3
    ? dark
      ? 'bg-green-700'
      : 'bg-green-300'
    : dark
    ? 'bg-green-600'
    : 'bg-green-400'
}

function errorResponse(message: string): ImageResponse {
  return new ImageResponse(
    (
      <div tw="h-full w-full flex flex-col p-4 items-center justify-center">
        <div tw="flex flex-col items-stretch rounded-xl shadow-2xl min-w-1/2">
          <div tw="text-3xl bg-red-600 text-white px-4 py-2 rounded-t-xl">
            Error
          </div>
          <div tw="text-xl border border-red-600 p-4 rounded-b-xl bg-white">
            {message}
          </div>
        </div>
      </div>
    ),
    { width: IMAGE_WIDTH, height: IMAGE_HEIGHT }
  )
}

async function getContribsByWeek(username: string) {
  const res = await fetch(`https://github.com/${username}`)
  const html = await res.text()

  const regex = /data-date="(.*?)" data-level="(.*?)"/g
  let match: RegExpExecArray | null = null
  const contribs = []
  while ((match = regex.exec(html)) !== null) {
    contribs.push(Number(match[2]))
  }

  const contribsByWeek = []
  for (let i = 0; i <= contribs.length / 7; i++) {
    contribsByWeek.push(contribs.slice(i * 7, (i + 1) * 7))
  }

  return contribsByWeek
}
